import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountForms } from "./forms";
import { getCustomer } from "@/lib/customer";
import { q } from "@/lib/db";
import { brl, dateTime, ORDER_STATUS } from "@/lib/format";
import type { Order } from "@/lib/orders";
import { logoutCustomer } from "../conta-actions";

export const metadata: Metadata = { title: "Minha conta", robots: { index: false } };

export default async function MinhaConta() {
  const me = await getCustomer();
  if (!me) redirect("/entrar?next=/minha-conta");
  const orders = await q<Order>("select * from orders where customer_id=$1 order by created_at desc limit 100", [me.id]);
  return (
    <div className="container" style={{ maxWidth: 1000, paddingBottom: 64 }}>
      <div className="page-head row between wrap">
        <div>
          <span className="eyebrow">Minha conta</span>
          <h1>Olá, {me.name.split(" ")[0]}!</h1>
        </div>
        <form action={logoutCustomer}><button className="btn ghost sm">Sair</button></form>
      </div>
      <div className="stack" style={{ gap: 20 }}>
        <div className="card">
          <h2>Meus pedidos</h2>
          {orders.length === 0 ? (
            <p className="muted">Você ainda não fez pedidos. <Link href="/produtos" className="link">Ver produtos</Link></p>
          ) : (
            <div className="table-wrap" style={{ border: 0 }}>
              <table className="t">
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td><Link href={`/pedido/${o.id}?t=${o.access_token}`} className="link" style={{ fontWeight: 700 }}>#{o.number}</Link><div className="small dim">{dateTime(o.created_at)}</div></td>
                      <td className="small">{o.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}</td>
                      <td><span className={`badge ${ORDER_STATUS[o.status]?.tone}`}>{ORDER_STATUS[o.status]?.label ?? o.status}</span></td>
                      <td style={{ textAlign: "right" }}><strong>{brl(o.total_cents)}</strong></td>
                      <td style={{ textAlign: "right" }}><Link href={`/pedido/${o.id}?t=${o.access_token}`} className="btn ghost sm">Ver</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <AccountForms me={me} />
      </div>
    </div>
  );
}
