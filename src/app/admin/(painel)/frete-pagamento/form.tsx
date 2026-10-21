"use client";
import { useState, useTransition } from "react";
import { centsToInput, parseMoney, slugify } from "@/lib/format";
import type { SiteSettings } from "@/lib/settings";
import { saveSiteSettings } from "../../actions";

type Opt = { id: string; name: string; price: string; days: string; requires_address: boolean };

export function ShippingPaymentForm({ shipping, payments, mpReady, siteUrl }: { shipping: SiteSettings["shipping"]; payments: SiteSettings["payments"]; mpReady: boolean; siteUrl: string }) {
  const [opts, setOpts] = useState<Opt[]>(shipping.options.map((o) => ({ ...o, price: centsToInput(o.price_cents) })));
  const [freeAbove, setFreeAbove] = useState(shipping.free_above_cents ? centsToInput(shipping.free_above_cents) : "");
  const [pay, setPay] = useState(payments);
  const [msg, setMsg] = useState<{ ok?: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const up = (i: number, patch: Partial<Opt>) => setOpts(opts.map((o, k) => (k === i ? { ...o, ...patch } : o)));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const options = opts.filter((o) => o.name.trim()).map((o, i) => ({ id: o.id || slugify(o.name) || `op${i}`, name: o.name.trim(), price_cents: parseMoney(o.price), days: o.days, requires_address: o.requires_address }));
      const r = await saveSiteSettings({ shipping: { ...shipping, options, free_above_cents: parseMoney(freeAbove) }, payments: { ...pay, pix_discount_percent: Math.max(0, Math.min(50, Number(pay.pix_discount_percent) || 0)) } });
      setMsg(r?.error ? { text: r.error } : { ok: true, text: r?.message ?? "Salvo" });
    });
  }

  return (
    <form onSubmit={submit} className="stack">
      <div className="card form-sec">
        <h2 style={{ margin: 0 }}>Formas de entrega</h2>
        {opts.map((o, i) => (
          <div className="repeat-row" key={i}>
            <div className="grid-3">
              <input type="text" placeholder="Nome (ex.: Correios PAC)" value={o.name} onChange={(e) => up(i, { name: e.target.value })} />
              <input type="text" inputMode="decimal" placeholder="Preço R$ (0 = grátis)" value={o.price} onChange={(e) => up(i, { price: e.target.value })} />
              <input type="text" placeholder="Prazo (ex.: 5 a 10 dias úteis)" value={o.days} onChange={(e) => up(i, { days: e.target.value })} />
            </div>
            <div className="row between">
              <label className="check"><input type="checkbox" checked={o.requires_address} onChange={(e) => up(i, { requires_address: e.target.checked })} /> Pede endereço (envio)</label>
              <button type="button" className="link small" style={{ color: "var(--bad)" }} onClick={() => setOpts(opts.filter((_, k) => k !== i))}>Remover</button>
            </div>
          </div>
        ))}
        <button type="button" className="btn ghost sm" style={{ justifySelf: "start" }} onClick={() => setOpts([...opts, { id: "", name: "", price: "", days: "", requires_address: true }])}>+ Forma de entrega</button>
        <label className="field">Frete grátis em compras acima de (R$, vazio = nunca)<input type="text" inputMode="decimal" value={freeAbove} onChange={(e) => setFreeAbove(e.target.value)} style={{ maxWidth: 220 }} /></label>
      </div>

      <div className="card form-sec">
        <h2 style={{ margin: 0 }}>Mercado Pago (Pix, cartão e boleto automáticos)</h2>
        {mpReady ? (
          <div className="alert ok">Conectado. Pagamentos aprovados mudam o pedido para “Pago” automaticamente.</div>
        ) : (
          <div className="alert">
            Ainda não conectado. Crie uma aplicação em mercadopago.com.br/developers, copie o <strong>Access Token de produção</strong> e coloque na variável <code>MP_ACCESS_TOKEN</code> da hospedagem.
            {siteUrl && <> Configure o webhook (Notificações → Pagamentos) para <code>{siteUrl}/api/webhooks/mercadopago</code>.</>}
          </div>
        )}
        <label className="check"><input type="checkbox" checked={pay.mercadopago} onChange={(e) => setPay({ ...pay, mercadopago: e.target.checked })} /> Oferecer Mercado Pago no checkout</label>
      </div>

      <div className="card form-sec">
        <h2 style={{ margin: 0 }}>Pix direto (sem taxa)</h2>
        <span className="small muted">O cliente recebe QR Code e copia e cola com o valor exato. Você confere o comprovante e marca o pedido como pago.</span>
        <label className="check"><input type="checkbox" checked={pay.pix} onChange={(e) => setPay({ ...pay, pix: e.target.checked })} /> Oferecer Pix direto</label>
        <div className="grid-2">
          <label className="field">Chave Pix<input type="text" value={pay.pix_key} onChange={(e) => setPay({ ...pay, pix_key: e.target.value })} placeholder="CPF, CNPJ, e-mail, telefone (+55...) ou aleatória" /></label>
          <label className="field">Desconto no Pix (%)<input type="number" min={0} max={50} value={pay.pix_discount_percent} onChange={(e) => setPay({ ...pay, pix_discount_percent: Number(e.target.value) })} /></label>
          <label className="field">Nome do recebedor<input type="text" value={pay.pix_name} onChange={(e) => setPay({ ...pay, pix_name: e.target.value })} /></label>
          <label className="field">Cidade do recebedor<input type="text" value={pay.pix_city} onChange={(e) => setPay({ ...pay, pix_city: e.target.value })} /></label>
        </div>
        <label className="field">Instruções após o pedido<input type="text" value={pay.instructions} onChange={(e) => setPay({ ...pay, instructions: e.target.value })} /></label>
      </div>

      <div className="card form-sec">
        <h2 style={{ margin: 0 }}>Combinar pelo WhatsApp</h2>
        <label className="check"><input type="checkbox" checked={pay.whatsapp} onChange={(e) => setPay({ ...pay, whatsapp: e.target.checked })} /> Permitir fechar o pedido e combinar o pagamento pelo WhatsApp</label>
      </div>

      <div className="sticky-save">
        {msg && <div className={`alert ${msg.ok ? "ok" : "bad"}`}>{msg.text}</div>}
        <button className="btn" disabled={pending}>{pending ? "Salvando…" : "Salvar"}</button>
      </div>
    </form>
  );
}
