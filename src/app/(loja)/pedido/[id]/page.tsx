import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import type { Metadata } from "next";
import { CopyButton } from "./copy";
import { ProductImage } from "@/components/product-card";
import { brl, dateTime, ORDER_STATUS, PAYMENT_LABEL } from "@/lib/format";
import { getOrderPublic, syncMercadoPagoPayment } from "@/lib/orders";
import { pixPayload } from "@/lib/pix";
import { getSettings, whatsappLink } from "@/lib/settings";

export const metadata: Metadata = { title: "Seu pedido", robots: { index: false } };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string; payment_id?: string; collection_id?: string }> };

export default async function OrderPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  let order = await getOrderPublic(id, sp.t ?? "");
  if (!order) notFound();
  const pid = sp.payment_id || sp.collection_id;
  if (pid && order.payment_method === "mercadopago" && order.status === "pending") {
    await syncMercadoPagoPayment(pid);
    order = (await getOrderPublic(id, sp.t ?? ""))!;
  }
  const s = await getSettings();
  const st = ORDER_STATUS[order.status] ?? { label: order.status, tone: "" };
  const pending = order.status === "pending";

  let pix: { code: string; qr: string } | null = null;
  if (pending && order.payment_method === "pix" && s.payments.pix_key) {
    const code = pixPayload({ key: s.payments.pix_key, name: s.payments.pix_name, city: s.payments.pix_city, amountCents: order.total_cents, txid: `LDZ${order.number}` });
    pix = { code, qr: await QRCode.toDataURL(code, { margin: 1, width: 440 }) };
  }
  const waText = `Olá! Fiz o pedido #${order.number} no site (${brl(order.total_cents)}).${order.payment_method === "pix" ? " Segue o comprovante do Pix." : ""}`;
  const wa = whatsappLink(s.contact.whatsapp, waText);
  const steps = ["paid", "production", "shipped", "delivered"];
  const reached = order.status === "canceled" ? -1 : steps.indexOf(order.status);

  return (
    <div className="container" style={{ maxWidth: 900, paddingBottom: 64 }}>
      <div className="page-head stack" style={{ gap: 12 }}>
        <span className="eyebrow">Pedido #{order.number} · {dateTime(order.created_at)}</span>
        <h1>{pending ? "Pedido recebido!" : order.status === "canceled" ? "Pedido cancelado" : "Obrigado pela compra!"}</h1>
        <div><span className={`badge ${st.tone}`}>{st.label}</span></div>
      </div>

      {order.status !== "canceled" && (
        <div className="timeline" style={{ marginBottom: 28 }}>
          {["Pago", "Em produção", "Enviado", "Entregue"].map((label, i) => (
            <div key={label} className={i <= reached ? "on" : ""}>{label}</div>
          ))}
        </div>
      )}

      <div className="stack" style={{ gap: 18 }}>
        {pending && order.payment_method === "pix" && pix && (
          <div className="card pix-box">
            <h2 style={{ fontSize: 22 }}>Pague {brl(order.total_cents)} com Pix</h2>
            <p className="muted small">Abra o app do seu banco, escolha Pix e escaneie o QR Code ou use o copia e cola.</p>
            <img src={pix.qr} alt="QR Code Pix" />
            <div className="pix-code">{pix.code}</div>
            <CopyButton text={pix.code} />
            <p className="small muted">{s.payments.instructions}</p>
            {wa && <a className="btn ghost" href={wa} target="_blank" rel="noopener">Enviar comprovante no WhatsApp</a>}
          </div>
        )}
        {pending && order.payment_method === "mercadopago" && (
          <div className="card stack">
            <h2 style={{ fontSize: 20 }}>Pagamento pendente</h2>
            <p className="muted">
              {order.payment_status === "rejected"
                ? "O pagamento não foi aprovado. Você pode tentar novamente com outra forma de pagamento."
                : order.payment_status === "in_process" || order.payment_status === "pending"
                  ? "Estamos aguardando a confirmação do pagamento. Esta página será atualizada quando for aprovado."
                  : "Conclua o pagamento no Mercado Pago para confirmar seu pedido."}
            </p>
            {order.payment_url && <a className="btn" href={order.payment_url}>Pagar agora</a>}
          </div>
        )}
        {pending && order.payment_method === "whatsapp" && (
          <div className="card stack">
            <h2 style={{ fontSize: 20 }}>Vamos finalizar pelo WhatsApp</h2>
            <p className="muted">Envie uma mensagem com o número do pedido para combinarmos o pagamento.</p>
            {wa && <a className="btn" href={wa} target="_blank" rel="noopener">Abrir WhatsApp</a>}
          </div>
        )}
        {order.tracking_code && (
          <div className="card row between wrap">
            <div><span className="small muted">Código de rastreio</span><div style={{ fontWeight: 700, fontSize: 18 }}>{order.tracking_code}</div></div>
            <a className="btn ghost sm" href={`https://rastreamento.correios.com.br/app/index.php?objeto=${encodeURIComponent(order.tracking_code)}`} target="_blank" rel="noopener">Rastrear</a>
          </div>
        )}

        <div className="card">
          <h2>Itens</h2>
          {order.items.map((l, i) => (
            <div className="cart-line" key={i} style={{ gridTemplateColumns: "60px 1fr auto" }}>
              <div className="ph" style={{ width: 60, height: 60 }}><ProductImage src={l.image} alt={l.name} /></div>
              <div>
                <div style={{ fontWeight: 600 }}>{l.qty}× {l.name}</div>
                {Object.keys(l.options).length > 0 && <div className="small muted">{Object.entries(l.options).map(([k, v]) => `${k}: ${v}`).join(" · ")}</div>}
              </div>
              <strong>{brl(l.total_cents)}</strong>
            </div>
          ))}
          <div className="summary" style={{ position: "static", marginTop: 14 }}>
            <div className="line"><span>Subtotal</span><span>{brl(order.subtotal_cents)}</span></div>
            <div className="line"><span>Frete · {order.shipping_method}</span><span>{order.shipping_cents ? brl(order.shipping_cents) : "Grátis"}</span></div>
            {order.discount_cents > 0 && <div className="line"><span>Descontos{order.coupon_code ? ` (${order.coupon_code})` : ""}</span><span>−{brl(order.discount_cents)}</span></div>}
            <div className="total"><span>Total</span><span>{brl(order.total_cents)}</span></div>
          </div>
        </div>

        <div className="grid-2">
          <div className="card stack" style={{ gap: 6 }}>
            <h2 style={{ marginBottom: 6 }}>Cliente</h2>
            <span>{order.customer.name}</span>
            <span className="muted small">{order.customer.email} · {order.customer.phone}</span>
            <span className="muted small">Pagamento: {PAYMENT_LABEL[order.payment_method] ?? order.payment_method}</span>
          </div>
          <div className="card stack" style={{ gap: 6 }}>
            <h2 style={{ marginBottom: 6 }}>Entrega</h2>
            {order.address ? (
              <span className="muted small">
                {order.address.street}, {order.address.number}{order.address.complement ? ` - ${order.address.complement}` : ""}<br />
                {order.address.district} · {order.address.city}/{order.address.state} · {order.address.cep}
              </span>
            ) : (
              <span className="muted small">{order.shipping_method}</span>
            )}
          </div>
        </div>
        <p className="small dim">Guarde o link desta página para acompanhar seu pedido. <Link href="/produtos" className="link">Voltar à loja</Link></p>
      </div>
    </div>
  );
}
