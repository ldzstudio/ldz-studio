import Link from "next/link";
import { q } from "@/lib/db";
import { brl, dateTime, ORDER_STATUS, PAYMENT_LABEL } from "@/lib/format";
import type { Order } from "@/lib/orders";

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ status?: string; busca?: string }> }) {
  const sp = await searchParams;
  const where: string[] = [];
  const params: unknown[] = [];
  if (sp.status && ORDER_STATUS[sp.status]) {
    params.push(sp.status);
    where.push(`status=$${params.length}`);
  }
  if (sp.busca) {
    params.push(`%${sp.busca}%`);
    where.push(`(customer->>'name' ilike $${params.length} or customer->>'email' ilike $${params.length} or number::text = $${params.length + 1})`);
    params.push(sp.busca.replace(/\D/g, ""));
  }
  const orders = await q<Order>(`select * from orders ${where.length ? "where " + where.join(" and ") : ""} order by created_at desc limit 300`, params);
  const counts = await q<{ status: string; n: number }>("select status, count(*)::int n from orders group by status");
  const n = (s: string) => counts.find((c) => c.status === s)?.n ?? 0;
  return (
    <>
      <div className="adm-top">
        <h1>Pedidos</h1>
        <form action="/admin/pedidos" className="row">
          {sp.status && <input type="hidden" name="status" value={sp.status} />}
          <input type="search" name="busca" placeholder="Nome, e-mail ou nº" defaultValue={sp.busca ?? ""} style={{ height: 40 }} />
        </form>
      </div>
      <div className="filters">
        <Link href="/admin/pedidos" className={`chip ${!sp.status ? "on" : ""}`}>Todos</Link>
        {Object.entries(ORDER_STATUS).map(([k, v]) => (
          <Link key={k} href={`/admin/pedidos?status=${k}`} className={`chip ${sp.status === k ? "on" : ""}`}>{v.label} ({n(k)})</Link>
        ))}
      </div>
      {orders.length === 0 ? (
        <div className="empty">Nenhum pedido encontrado.</div>
      ) : (
        <div className="table-wrap">
          <table className="t">
            <thead><tr><th>Pedido</th><th>Cliente</th><th>Itens</th><th>Pagamento</th><th>Status</th><th style={{ textAlign: "right" }}>Total</th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td><Link href={`/admin/pedidos/${o.id}`} className="link" style={{ fontWeight: 700 }}>#{o.number}</Link><div className="small dim">{dateTime(o.created_at)}</div></td>
                  <td>{o.customer.name}<div className="small dim">{o.customer.phone}</div></td>
                  <td className="small">{o.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}</td>
                  <td className="small muted">{PAYMENT_LABEL[o.payment_method] ?? o.payment_method}</td>
                  <td><span className={`badge ${ORDER_STATUS[o.status]?.tone}`}>{ORDER_STATUS[o.status]?.label ?? o.status}</span></td>
                  <td style={{ textAlign: "right" }}><strong>{brl(o.total_cents)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
