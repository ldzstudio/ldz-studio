import "server-only";
import { db, one, q } from "./db";
import { unitPrice, type Product } from "./catalog";
import { getSettings, mercadoPagoReady, type SiteSettings } from "./settings";

export type CartItemInput = { productId: number; qty: number; options?: Record<string, string> };
export type OrderLine = {
  product_id: number;
  name: string;
  slug: string;
  image: string | null;
  options: Record<string, string>;
  qty: number;
  unit_cents: number;
  total_cents: number;
};
export type Coupon = {
  code: string;
  type: "percent" | "fixed" | "shipping";
  value: number;
  min_cents: number;
  max_uses: number | null;
  uses: number;
  active: boolean;
  expires_at: string | null;
};

export type Quote = {
  lines: OrderLine[];
  subtotal_cents: number;
  shipping_cents: number;
  discount_cents: number;
  total_cents: number;
  coupon: Coupon | null;
  coupon_error: string | null;
  shipping_method: string | null;
  errors: string[];
};

export async function findCoupon(code: string) {
  if (!code) return null;
  return one<Coupon>("select * from coupons where upper(code)=upper($1)", [code.trim()]);
}

function couponProblem(c: Coupon | null, subtotal: number) {
  if (!c || !c.active) return "Cupom inválido";
  if (c.expires_at && new Date(c.expires_at) < new Date()) return "Cupom expirado";
  if (c.max_uses != null && c.uses >= c.max_uses) return "Cupom esgotado";
  if (subtotal < c.min_cents) return `Cupom válido para compras acima de R$ ${(c.min_cents / 100).toFixed(2).replace(".", ",")}`;
  return null;
}

export async function quote(
  items: CartItemInput[],
  opts: { coupon?: string; shippingId?: string; payment?: string },
  settings?: SiteSettings,
): Promise<Quote> {
  const s = settings ?? (await getSettings());
  const errors: string[] = [];
  const ids = [...new Set(items.map((i) => Number(i.productId)).filter(Boolean))];
  const products = ids.length ? await q<Product>("select * from products where id = any($1)", [ids]) : [];
  const lines: OrderLine[] = [];
  for (const item of items.slice(0, 50)) {
    const p = products.find((x) => x.id === Number(item.productId));
    const qty = Math.max(1, Math.min(99, Math.floor(Number(item.qty) || 1)));
    if (!p || !p.active) {
      errors.push("Um produto do carrinho não está mais disponível.");
      continue;
    }
    const options: Record<string, string> = {};
    for (const opt of p.options ?? []) {
      const chosen = item.options?.[opt.name];
      if (chosen && opt.values.some((v) => v.label === chosen)) options[opt.name] = chosen;
      else if (opt.values.length) options[opt.name] = opt.values[0].label;
    }
    const sameProductQty = lines.filter((l) => l.product_id === p.id).reduce((a, l) => a + l.qty, 0) + qty;
    if (p.stock != null && sameProductQty > p.stock) {
      errors.push(p.stock > 0 ? `"${p.name}": só temos ${p.stock} em estoque.` : `"${p.name}" está esgotado.`);
    }
    const unit = unitPrice(p, options);
    lines.push({ product_id: p.id, name: p.name, slug: p.slug, image: p.images?.[0] ?? null, options, qty, unit_cents: unit, total_cents: unit * qty });
  }
  const subtotal = lines.reduce((a, l) => a + l.total_cents, 0);

  const shippingOpt = s.shipping.options.find((o) => o.id === opts.shippingId) ?? null;
  let shipping = shippingOpt?.price_cents ?? 0;
  if (shippingOpt && s.shipping.free_above_cents > 0 && subtotal >= s.shipping.free_above_cents && shippingOpt.requires_address) shipping = 0;

  let discount = 0;
  let coupon: Coupon | null = null;
  let coupon_error: string | null = null;
  if (opts.coupon) {
    const c = await findCoupon(opts.coupon);
    coupon_error = couponProblem(c, subtotal);
    if (!coupon_error && c) {
      coupon = c;
      if (c.type === "percent") discount = Math.round((subtotal * Math.min(100, c.value)) / 100);
      else if (c.type === "fixed") discount = Math.min(subtotal, c.value);
      else if (c.type === "shipping") shipping = 0;
    }
  }
  if (opts.payment === "pix" && s.payments.pix_discount_percent > 0) {
    discount += Math.round(((subtotal - discount) * s.payments.pix_discount_percent) / 100);
  }
  const total = Math.max(0, subtotal - discount + shipping);
  return { lines, subtotal_cents: subtotal, shipping_cents: shipping, discount_cents: discount, total_cents: total, coupon, coupon_error, shipping_method: shippingOpt?.name ?? null, errors };
}

export type Order = {
  id: string;
  number: number;
  access_token: string;
  status: string;
  customer: { name: string; email: string; phone: string; cpf?: string };
  address: { cep: string; street: string; number: string; complement: string; district: string; city: string; state: string } | null;
  items: OrderLine[];
  subtotal_cents: number;
  shipping_cents: number;
  discount_cents: number;
  total_cents: number;
  shipping_method: string | null;
  coupon_code: string | null;
  payment_method: string;
  payment_status: string;
  payment_id: string | null;
  payment_url: string | null;
  tracking_code: string | null;
  notes: string;
  admin_notes: string;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function createOrder(input: {
  items: CartItemInput[];
  customer: Order["customer"];
  address: Order["address"];
  shippingId: string;
  coupon?: string;
  payment: string;
  notes?: string;
}) {
  const s = await getSettings();
  const allowed = [
    s.payments.mercadopago && mercadoPagoReady() ? "mercadopago" : null,
    s.payments.pix && s.payments.pix_key ? "pix" : null,
    s.payments.whatsapp ? "whatsapp" : null,
  ].filter(Boolean);
  if (!allowed.includes(input.payment)) throw new Error("Forma de pagamento indisponível.");
  const shippingOpt = s.shipping.options.find((o) => o.id === input.shippingId);
  if (!shippingOpt) throw new Error("Escolha a forma de entrega.");
  if (shippingOpt.requires_address && !input.address) throw new Error("Informe o endereço de entrega.");

  const qt = await quote(input.items, { coupon: input.coupon, shippingId: input.shippingId, payment: input.payment }, s);
  if (!qt.lines.length) throw new Error("Seu carrinho está vazio.");
  if (qt.errors.length) throw new Error(qt.errors.join(" "));
  if (input.coupon && qt.coupon_error) throw new Error(qt.coupon_error);

  const client = await (await db()).connect();
  try {
    await client.query("begin");
    for (const line of qt.lines) {
      const r = await client.query<{ stock: number | null }>("select stock from products where id=$1 for update", [line.product_id]);
      const stock = r.rows[0]?.stock;
      if (stock == null) continue;
      if (stock < line.qty) throw new Error(`"${line.name}" ficou sem estoque.`);
      await client.query("update products set stock = stock - $2 where id=$1", [line.product_id, line.qty]);
    }
    if (qt.coupon) await client.query("update coupons set uses = uses + 1 where code=$1", [qt.coupon.code]);
    const { rows } = await client.query<Order>(
      `insert into orders(customer, address, items, subtotal_cents, shipping_cents, discount_cents, total_cents, shipping_method, coupon_code, payment_method, notes)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning *`,
      [
        JSON.stringify(input.customer),
        shippingOpt.requires_address ? JSON.stringify(input.address) : null,
        JSON.stringify(qt.lines),
        qt.subtotal_cents,
        qt.shipping_cents,
        qt.discount_cents,
        qt.total_cents,
        `${shippingOpt.name}${shippingOpt.days ? ` (${shippingOpt.days})` : ""}`,
        qt.coupon?.code ?? null,
        input.payment,
        (input.notes ?? "").slice(0, 1000),
      ],
    );
    await client.query("commit");
    return rows[0];
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
}

export async function getOrderPublic(id: string, token: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return one<Order>("select * from orders where id=$1 and access_token=$2", [id, token]);
}

export async function setOrderStatus(id: string, status: string) {
  const prev = await one<Order>("select * from orders where id=$1", [id]);
  if (!prev || prev.status === status) return prev;
  // devolve estoque ao cancelar / retira de novo ao reabrir
  if (status === "canceled" || prev.status === "canceled") {
    const sign = status === "canceled" ? 1 : -1;
    for (const l of prev.items) {
      await q("update products set stock = stock + $2 where id=$1 and stock is not null", [l.product_id, sign * l.qty]);
    }
  }
  const paidNow = status === "paid" && !prev.paid_at;
  return one<Order>(
    `update orders set status=$2, updated_at=now()${paidNow ? ", paid_at=now(), payment_status='approved'" : ""} where id=$1 returning *`,
    [id, status],
  );
}

/* ---------------- Mercado Pago ---------------- */

const MP = "https://api.mercadopago.com";

function siteUrl() {
  return (process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

export async function createMercadoPagoCheckout(order: Order) {
  const s = await getSettings();
  const base = siteUrl();
  const back = `${base}/pedido/${order.id}?t=${order.access_token}`;
  const items = order.items.map((l) => ({
    id: String(l.product_id),
    title: l.name + (Object.keys(l.options).length ? ` (${Object.values(l.options).join(", ")})` : ""),
    quantity: l.qty,
    unit_price: l.unit_cents / 100,
    currency_id: "BRL",
  }));
  if (order.shipping_cents > 0) items.push({ id: "frete", title: `Frete - ${order.shipping_method}`, quantity: 1, unit_price: order.shipping_cents / 100, currency_id: "BRL" });
  const body: any = {
    items,
    payer: { name: order.customer.name, email: order.customer.email },
    external_reference: order.id,
    statement_descriptor: s.store_name.slice(0, 13),
    back_urls: { success: back, pending: back, failure: back },
    metadata: { order_number: order.number },
  };
  if (order.discount_cents > 0) {
    // MP não aceita item negativo: distribui o desconto proporcionalmente
    const gross = items.reduce((a, i) => a + i.unit_price * i.quantity, 0);
    const factor = (gross - order.discount_cents / 100) / gross;
    body.items = items.map((i) => ({ ...i, unit_price: Math.round(i.unit_price * factor * 100) / 100 }));
  }
  if (!/localhost|127\.0\.0\.1/.test(base)) {
    body.notification_url = `${base}/api/webhooks/mercadopago`;
    body.auto_return = "approved";
  }
  const res = await fetch(`${MP}/checkout/preferences`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`, "Content-Type": "application/json", "X-Idempotency-Key": order.id },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    console.error("Mercado Pago:", data);
    throw new Error("Não foi possível iniciar o pagamento no Mercado Pago.");
  }
  await q("update orders set payment_url=$2, updated_at=now() where id=$1", [order.id, data.init_point]);
  return data.init_point as string;
}

/** Consulta um pagamento no Mercado Pago e atualiza o pedido. */
export async function syncMercadoPagoPayment(paymentId: string) {
  if (!process.env.MP_ACCESS_TOKEN || !/^\d+$/.test(paymentId)) return null;
  const res = await fetch(`${MP}/v1/payments/${paymentId}`, { headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` } });
  if (!res.ok) return null;
  const p = await res.json();
  const orderId = p.external_reference as string;
  if (!orderId) return null;
  const order = await one<Order>("select * from orders where id=$1", [orderId]);
  if (!order) return null;
  await q("update orders set payment_status=$2, payment_id=$3, updated_at=now() where id=$1", [orderId, p.status, String(p.id)]);
  if (p.status === "approved" && order.status === "pending") {
    const paidCents = Math.round(Number(p.transaction_amount) * 100);
    if (paidCents + 2 >= order.total_cents) await setOrderStatus(orderId, "paid");
  } else if ((p.status === "rejected" || p.status === "cancelled") && order.status === "pending") {
    // mantém o pedido aberto: o cliente pode tentar pagar de novo
  } else if (p.status === "refunded" && order.status !== "canceled") {
    await setOrderStatus(orderId, "canceled");
  }
  return p.status as string;
}
