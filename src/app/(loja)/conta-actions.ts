"use server";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { one, q } from "@/lib/db";
import { endCustomerSession, getCustomer, startCustomerSession } from "@/lib/customer";

export type FormState = { error?: string; message?: string; values?: Record<string, string> } | null;

const str = (f: FormData, k: string, max = 200) => String(f.get(k) ?? "").trim().slice(0, max);
const EMAIL = /^\S+@\S+\.\S+$/;

function safeNext(v: string) {
  return v.startsWith("/") && !v.startsWith("//") ? v : "/minha-conta";
}

const attempts = new Map<string, { n: number; until: number }>();

export async function registerCustomer(_: FormState, f: FormData): Promise<FormState> {
  const name = str(f, "name", 120);
  const email = str(f, "email", 160).toLowerCase();
  const phone = str(f, "phone", 30);
  const password = String(f.get("password") ?? "");
  const values = { name, email, phone };
  if (!name || !EMAIL.test(email)) return { error: "Preencha nome e e-mail corretamente.", values };
  if (password.length < 8) return { error: "A senha precisa ter pelo menos 8 caracteres.", values };
  if (password !== String(f.get("confirm") ?? "")) return { error: "As senhas não conferem.", values };
  const exists = await one("select 1 from customers where email=$1", [email]);
  if (exists) return { error: "Já existe uma conta com esse e-mail. Use a opção Entrar.", values };
  const c = await one<{ id: number }>(
    "insert into customers(name, email, phone, password_hash, last_login_at) values ($1,$2,$3,$4,now()) returning id",
    [name, email, phone, await bcrypt.hash(password, 10)],
  );
  await startCustomerSession(c!.id, email);
  redirect(safeNext(str(f, "next")));
}

export async function loginCustomer(_: FormState, f: FormData): Promise<FormState> {
  const email = str(f, "email", 160).toLowerCase();
  const password = String(f.get("password") ?? "");
  const a = attempts.get(email);
  if (a && a.until > Date.now()) return { error: "Muitas tentativas. Aguarde alguns minutos.", values: { email } };
  const c = await one<{ id: number; password_hash: string }>("select id, password_hash from customers where email=$1", [email]);
  if (!c || !(await bcrypt.compare(password, c.password_hash))) {
    const n = (a?.n ?? 0) + 1;
    attempts.set(email, { n, until: n >= 5 ? Date.now() + 10 * 60_000 : 0 });
    return { error: "E-mail ou senha incorretos.", values: { email } };
  }
  attempts.delete(email);
  await q("update customers set last_login_at=now() where id=$1", [c.id]);
  await startCustomerSession(c.id, email);
  redirect(safeNext(str(f, "next")));
}

export async function logoutCustomer() {
  await endCustomerSession();
  redirect("/");
}

export async function updateProfile(_: FormState, f: FormData): Promise<FormState> {
  const me = await getCustomer();
  if (!me) redirect("/entrar");
  const name = str(f, "name", 120);
  if (!name) return { error: "Informe seu nome." };
  const address = {
    cep: str(f, "cep", 10),
    street: str(f, "street"),
    number: str(f, "number", 20),
    complement: str(f, "complement", 80),
    district: str(f, "district", 80),
    city: str(f, "city", 80),
    state: str(f, "state", 2),
  };
  await q("update customers set name=$2, phone=$3, cpf=$4, address=$5 where id=$1", [
    me.id,
    name,
    str(f, "phone", 30),
    str(f, "cpf", 20),
    address.cep || address.street ? JSON.stringify(address) : null,
  ]);
  revalidatePath("/minha-conta");
  return { message: "Dados salvos." };
}

export async function changeCustomerPassword(_: FormState, f: FormData): Promise<FormState> {
  const me = await getCustomer();
  if (!me) redirect("/entrar");
  const next = String(f.get("next_password") ?? "");
  if (next.length < 8) return { error: "A nova senha precisa ter pelo menos 8 caracteres." };
  const row = await one<{ password_hash: string }>("select password_hash from customers where id=$1", [me.id]);
  if (!row || !(await bcrypt.compare(String(f.get("current") ?? ""), row.password_hash))) return { error: "Senha atual incorreta." };
  await q("update customers set password_hash=$2 where id=$1", [me.id, await bcrypt.hash(next, 10)]);
  return { message: "Senha alterada." };
}
