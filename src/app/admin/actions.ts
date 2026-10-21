"use server";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { one, q } from "@/lib/db";
import { parseMoney, slugify } from "@/lib/format";
import { setOrderStatus } from "@/lib/orders";
import { SESSION_COOKIE, signSession } from "@/lib/session";
import { DEFAULT_SETTINGS, saveSettings, type SiteSettings } from "@/lib/settings";
import type { ProductOption } from "@/lib/catalog";

export type ActionState = { ok?: boolean; error?: string; message?: string } | null;

/* ---------- Login ---------- */

const attempts = new Map<string, { n: number; until: number }>();

export async function login(_: ActionState, form: FormData): Promise<ActionState> {
  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");
  const a = attempts.get(email);
  if (a && a.until > Date.now()) return { error: "Muitas tentativas. Aguarde alguns minutos." };
  const user = await one<{ id: number; email: string; password_hash: string }>("select * from admin_users where email=$1", [email]);
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    const n = (a?.n ?? 0) + 1;
    attempts.set(email, { n, until: n >= 5 ? Date.now() + 10 * 60_000 : 0 });
    return { error: "E-mail ou senha incorretos." };
  }
  attempts.delete(email);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await signSession(user.id, user.email), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  redirect("/admin");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/admin/login");
}

export async function changePassword(_: ActionState, form: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const current = String(form.get("current") || "");
  const next = String(form.get("next") || "");
  if (next.length < 8) return { error: "A nova senha precisa ter pelo menos 8 caracteres." };
  const user = await one<{ password_hash: string }>("select password_hash from admin_users where id=$1", [admin.id]);
  if (!user || !(await bcrypt.compare(current, user.password_hash))) return { error: "Senha atual incorreta." };
  await q("update admin_users set password_hash=$2 where id=$1", [admin.id, await bcrypt.hash(next, 10)]);
  return { ok: true, message: "Senha alterada." };
}

export async function addAdmin(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");
  if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 8) return { error: "Informe um e-mail válido e senha com 8+ caracteres." };
  try {
    await q("insert into admin_users(email, password_hash) values ($1,$2)", [email, await bcrypt.hash(password, 10)]);
  } catch {
    return { error: "Esse e-mail já tem acesso." };
  }
  revalidatePath("/admin/conta");
  return { ok: true, message: `Acesso criado para ${email}.` };
}

export async function removeAdmin(id: number) {
  const admin = await requireAdmin();
  if (id === admin.id) return;
  await q("delete from admin_users where id=$1", [id]);
  revalidatePath("/admin/conta");
}

/* ---------- Produtos ---------- */

export type ProductInput = {
  id?: number;
  name: string;
  slug: string;
  short_description: string;
  description: string;
  price: string;
  compare_at: string;
  cost: string;
  stock: string;
  active: boolean;
  featured: boolean;
  category_id: string;
  images: string[];
  options: { name: string; values: { label: string; delta: string }[] }[];
  production_days: string;
  weight_g: string;
  sort: string;
};

export async function saveProduct(input: ProductInput): Promise<ActionState & { id?: number }> {
  await requireAdmin();
  const name = input.name.trim();
  if (!name) return { error: "Dê um nome ao produto." };
  const price = parseMoney(input.price);
  if (price <= 0) return { error: "Informe o preço." };
  let slug = slugify(input.slug || name) || `produto-${Date.now()}`;
  const clash = await one("select id from products where slug=$1 and id is distinct from $2", [slug, input.id ?? null]);
  if (clash) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  const options: ProductOption[] = input.options
    .map((o) => ({
      name: o.name.trim(),
      values: o.values.filter((v) => v.label.trim()).map((v) => ({ label: v.label.trim(), price_delta_cents: parseMoney(v.delta) })),
    }))
    .filter((o) => o.name && o.values.length);
  const vals = [
    name,
    slug,
    input.short_description.trim(),
    input.description.trim(),
    price,
    input.compare_at.trim() ? parseMoney(input.compare_at) : null,
    input.cost.trim() ? parseMoney(input.cost) : null,
    input.stock.trim() === "" ? null : Math.max(0, parseInt(input.stock, 10) || 0),
    input.active,
    input.featured,
    input.category_id ? Number(input.category_id) : null,
    input.images.slice(0, 20),
    JSON.stringify(options),
    Math.max(0, parseInt(input.production_days, 10) || 0),
    Math.max(0, parseInt(input.weight_g, 10) || 0),
    parseInt(input.sort, 10) || 0,
  ];
  let id = input.id;
  if (id) {
    await q(
      `update products set name=$1, slug=$2, short_description=$3, description=$4, price_cents=$5, compare_at_cents=$6, cost_cents=$7, stock=$8,
       active=$9, featured=$10, category_id=$11, images=$12, options=$13, production_days=$14, weight_g=$15, sort=$16, updated_at=now() where id=$17`,
      [...vals, id],
    );
  } else {
    const r = await one<{ id: number }>(
      `insert into products(name, slug, short_description, description, price_cents, compare_at_cents, cost_cents, stock, active, featured, category_id, images, options, production_days, weight_g, sort)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) returning id`,
      vals,
    );
    id = r!.id;
  }
  revalidatePath("/", "layout");
  return { ok: true, id, message: "Produto salvo." };
}

export async function deleteProduct(id: number) {
  await requireAdmin();
  await q("delete from products where id=$1", [id]);
  revalidatePath("/", "layout");
  redirect("/admin/produtos");
}

export async function duplicateProduct(id: number) {
  await requireAdmin();
  const r = await one<{ id: number }>(
    `insert into products(name, slug, short_description, description, price_cents, compare_at_cents, cost_cents, stock, active, featured, category_id, images, options, production_days, weight_g, sort)
     select name || ' (cópia)', slug || '-copia-' || substr(md5(random()::text), 1, 4), short_description, description, price_cents, compare_at_cents, cost_cents, stock, false, false, category_id, images, options, production_days, weight_g, sort
     from products where id=$1 returning id`,
    [id],
  );
  redirect(`/admin/produtos/${r!.id}`);
}

export async function toggleProduct(id: number, field: "active" | "featured") {
  await requireAdmin();
  await q(`update products set ${field === "active" ? "active = not active" : "featured = not featured"}, updated_at=now() where id=$1`, [id]);
  revalidatePath("/", "layout");
}

/* ---------- Categorias ---------- */

export async function saveCategory(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = Number(form.get("id")) || null;
  const name = String(form.get("name") || "").trim();
  if (!name) return { error: "Informe o nome." };
  const slug = slugify(String(form.get("slug") || "") || name);
  const description = String(form.get("description") || "").trim();
  const sort = parseInt(String(form.get("sort") || "0"), 10) || 0;
  const active = form.get("active") === "on";
  try {
    if (id) await q("update categories set name=$1, slug=$2, description=$3, sort=$4, active=$5 where id=$6", [name, slug, description, sort, active, id]);
    else await q("insert into categories(name, slug, description, sort, active) values ($1,$2,$3,$4,$5)", [name, slug, description, sort, active]);
  } catch {
    return { error: "Já existe uma categoria com esse endereço (slug)." };
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "Categoria salva." };
}

export async function deleteCategory(id: number) {
  await requireAdmin();
  await q("delete from categories where id=$1", [id]);
  revalidatePath("/", "layout");
}

/* ---------- Pedidos ---------- */

export async function updateOrder(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = String(form.get("id"));
  const status = String(form.get("status") || "");
  await setOrderStatus(id, status);
  await q("update orders set tracking_code=$2, admin_notes=$3, updated_at=now() where id=$1", [
    id,
    String(form.get("tracking_code") || "").trim() || null,
    String(form.get("admin_notes") || ""),
  ]);
  revalidatePath(`/admin/pedidos/${id}`);
  revalidatePath("/admin/pedidos");
  return { ok: true, message: "Pedido atualizado." };
}

export async function deleteOrder(id: string) {
  await requireAdmin();
  await setOrderStatus(id, "canceled");
  await q("delete from orders where id=$1", [id]);
  redirect("/admin/pedidos");
}

/* ---------- Cupons ---------- */

export async function saveCoupon(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const code = String(form.get("code") || "").trim().toUpperCase().replace(/\s+/g, "");
  const original = String(form.get("original") || "");
  const type = String(form.get("type"));
  if (!code) return { error: "Informe o código." };
  if (!["percent", "fixed", "shipping"].includes(type)) return { error: "Tipo inválido." };
  const value = type === "percent" ? Math.min(100, parseInt(String(form.get("value") || "0"), 10) || 0) : type === "fixed" ? parseMoney(form.get("value")) : 0;
  const min = parseMoney(form.get("min"));
  const maxUses = String(form.get("max_uses") || "").trim() ? parseInt(String(form.get("max_uses")), 10) : null;
  const expires = String(form.get("expires_at") || "").trim() || null;
  const active = form.get("active") === "on";
  try {
    if (original) {
      await q("update coupons set code=$1, type=$2, value=$3, min_cents=$4, max_uses=$5, expires_at=$6, active=$7 where code=$8", [code, type, value, min, maxUses, expires ? `${expires}T23:59:59-03:00` : null, active, original]);
    } else {
      await q("insert into coupons(code, type, value, min_cents, max_uses, expires_at, active) values ($1,$2,$3,$4,$5,$6,$7)", [code, type, value, min, maxUses, expires ? `${expires}T23:59:59-03:00` : null, active]);
    }
  } catch {
    return { error: "Já existe um cupom com esse código." };
  }
  revalidatePath("/admin/cupons");
  return { ok: true, message: "Cupom salvo." };
}

export async function deleteCoupon(code: string) {
  await requireAdmin();
  await q("delete from coupons where code=$1", [code]);
  revalidatePath("/admin/cupons");
}

/* ---------- Configurações do site ---------- */

export async function saveSiteSettings(patch: Partial<SiteSettings>): Promise<ActionState> {
  await requireAdmin();
  const clean = Object.fromEntries(Object.entries(patch).filter(([k]) => k in DEFAULT_SETTINGS));
  await saveSettings(clean);
  revalidatePath("/", "layout");
  return { ok: true, message: "Alterações salvas e publicadas." };
}
