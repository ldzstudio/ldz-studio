import { NextResponse } from "next/server";
import { getCustomer } from "@/lib/customer";
import { q } from "@/lib/db";
import { createMercadoPagoCheckout, createOrder } from "@/lib/orders";

const str = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);

export async function POST(req: Request) {
  try {
    const b = await req.json();
    const me = await getCustomer();
    const customer = { name: str(b.customer?.name, 120), email: str(b.customer?.email, 160).toLowerCase(), phone: str(b.customer?.phone, 30), cpf: str(b.customer?.cpf, 20) };
    if (me) customer.email = me.email;
    if (!customer.name || !/^\S+@\S+\.\S+$/.test(customer.email) || customer.phone.replace(/\D/g, "").length < 10) {
      return NextResponse.json({ error: "Preencha nome, e-mail e WhatsApp corretamente." }, { status: 400 });
    }
    const a = b.address;
    const address = a
      ? { cep: str(a.cep, 10), street: str(a.street), number: str(a.number, 20), complement: str(a.complement, 80), district: str(a.district, 80), city: str(a.city, 80), state: str(a.state, 2) }
      : null;
    if (address && (!address.cep || !address.street || !address.number || !address.city || !address.state)) {
      return NextResponse.json({ error: "Complete o endereço de entrega." }, { status: 400 });
    }
    const order = await createOrder({
      items: Array.isArray(b.items) ? b.items : [],
      customer,
      address,
      shippingId: str(b.shippingId, 40),
      coupon: str(b.coupon, 40) || undefined,
      payment: str(b.payment, 20),
      notes: str(b.notes, 1000),
      customerId: me?.id ?? null,
    });
    if (me) {
      // completa o cadastro com o que foi informado na compra
      await q(
        "update customers set phone = case when phone='' then $2 else phone end, cpf = case when cpf='' then $3 else cpf end, address = coalesce(address, $4) where id=$1",
        [me.id, customer.phone, customer.cpf, address ? JSON.stringify(address) : null],
      );
    }
    const orderUrl = `/pedido/${order.id}?t=${order.access_token}`;
    if (order.payment_method === "mercadopago") {
      try {
        return NextResponse.json({ redirect: await createMercadoPagoCheckout(order) });
      } catch {
        return NextResponse.json({ redirect: orderUrl });
      }
    }
    return NextResponse.json({ redirect: orderUrl });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erro ao criar o pedido." }, { status: 400 });
  }
}
