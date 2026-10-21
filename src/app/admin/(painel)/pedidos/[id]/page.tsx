import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { one } from "@/lib/db";
import { brl, dateTime, ORDER_STATUS, PAYMENT_LABEL } from "@/lib/format";
import type { Order } from "@/lib/orders";
import { getSettings, whatsappLink } from "@/lib/settings";
import { deleteOrder, updateOrder } from "../../../actions";

export default async function AdminOrder({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const o = await one<Order>("select * from orders where id=$1", [id]);
  if (!o) notFound();
  const s = await getSettings();
  const base = (process.env.SITE_URL || "").replace(/\/$/, "");
  const link = `${base}/pedido/${o.id}?t=${o.access_token}`;
  const st = ORDER_STATUS[o.status];
  const msg = `Olá ${o.customer.name.split(" ")[0]}! Aqui é da ${s.store_name}. Seu pedido #${o.number} está: ${st?.label ?? o.status}.${o.tracking_code ? ` Código de rastreio: ${o.tracking_code}.` : ""} Acompanhe aqui: ${link}`;
  const wa = whatsappLink(o.customer.phone, msg);
  return (
    <>
      <div className="adm-top">
        <div>
          <Link href="/admin/pedidos" className="small muted">← Pedidos</Link>
          <h1 style={{ marginTop: 6 }}>Pedido #{o.number}</h1>
          <div className="row" style={{ marginTop: 8 }}><span className={`badge ${st?.tone}`}>{st?.label ?? o.status}</span><span className="small dim">{dateTime(o.created_at)}</span></div>
        </div>
        <div className="row wrap">
          {wa && <a href={wa} target="_blank" rel="noopener" className="btn sm">Avisar cliente no WhatsApp</a>}
          <a href={link} target="_blank" className="btn ghost sm">Página do cliente ↗</a>
        </div>
      </div>
      <div className="adm-grid" style={{ alignItems: "start" }}>
        <div className="stack">
          <div className="card">
            <h2>Itens</h2>
            <table className="t">
              <tbody>
                {o.items.map((l, i) => (
                  <tr key={i}>
                    <td><strong>{l.qty}×</strong> {l.name}{Object.keys(l.options).length > 0 && <div className="small muted">{Object.entries(l.options).map(([k, v]) => `${k}: ${v}`).join(" · ")}</div>}</td>
                    <td className="small muted">{brl(l.unit_cents)} un.</td>
                    <td style={{ textAlign: "right" }}>{brl(l.total_cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="summary" style={{ position: "static", marginTop: 14 }}>
              <div className="line"><span>Subtotal</span><span>{brl(o.subtotal_cents)}</span></div>
              <div className="line"><span>Frete · {o.shipping_method}</span><span>{brl(o.shipping_cents)}</span></div>
              {o.discount_cents > 0 && <div className="line"><span>Descontos{o.coupon_code ? ` (cupom ${o.coupon_code})` : ""}</span><span>−{brl(o.discount_cents)}</span></div>}
              <div className="total"><span>Total</span><span>{brl(o.total_cents)}</span></div>
            </div>
          </div>
          <div className="grid-2">
            <div className="card stack" style={{ gap: 6 }}>
              <h2 style={{ marginBottom: 4 }}>Cliente</h2>
              <strong>{o.customer.name}</strong>
              <a href={`mailto:${o.customer.email}`} className="small link">{o.customer.email}</a>
              <span className="small">{o.customer.phone}</span>
              {o.customer.cpf && <span className="small muted">CPF {o.customer.cpf}</span>}
            </div>
            <div className="card stack" style={{ gap: 6 }}>
              <h2 style={{ marginBottom: 4 }}>Entrega</h2>
              <span className="small">{o.shipping_method}</span>
              {o.address && (
                <span className="small muted">
                  {o.address.street}, {o.address.number}{o.address.complement ? ` - ${o.address.complement}` : ""}<br />
                  {o.address.district} · {o.address.city}/{o.address.state}<br />CEP {o.address.cep}
                </span>
              )}
            </div>
          </div>
          {o.notes && <div className="card"><h2>Observação do cliente</h2><p className="muted" style={{ whiteSpace: "pre-line" }}>{o.notes}</p></div>}
        </div>
        <div className="stack">
          <div className="card">
            <h2>Atualizar pedido</h2>
            <ActionForm action={updateOrder} submit="Salvar alterações">
              <input type="hidden" name="id" value={o.id} />
              <label className="field">Status
                <select name="status" defaultValue={o.status}>
                  {Object.entries(ORDER_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </label>
              <label className="field">Código de rastreio<input type="text" name="tracking_code" defaultValue={o.tracking_code ?? ""} placeholder="AA123456789BR" /></label>
              <label className="field">Anotações internas<textarea name="admin_notes" defaultValue={o.admin_notes} placeholder="Só você vê" /></label>
            </ActionForm>
          </div>
          <div className="card stack" style={{ gap: 6 }}>
            <h2 style={{ marginBottom: 4 }}>Pagamento</h2>
            <span className="small">{PAYMENT_LABEL[o.payment_method] ?? o.payment_method}</span>
            <span className="small muted">Situação: {o.payment_status}{o.payment_id ? ` · ID ${o.payment_id}` : ""}</span>
            {o.paid_at && <span className="small muted">Pago em {dateTime(o.paid_at)}</span>}
            {o.payment_method === "pix" && o.status === "pending" && <span className="small" style={{ color: "var(--warn)" }}>Pix direto: confira o comprovante e mude o status para “Pago”.</span>}
          </div>
          <form action={deleteOrder.bind(null, o.id)}><button className="btn danger sm">Excluir pedido</button></form>
        </div>
      </div>
    </>
  );
}
