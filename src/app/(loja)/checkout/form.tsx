"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { track, useCart } from "@/components/cart";
import { brl } from "@/lib/format";
import type { ShippingOption } from "@/lib/settings";
import type { Address } from "@/lib/customer";

type Quote = { subtotal_cents: number; shipping_cents: number; discount_cents: number; total_cents: number; coupon_error: string | null; coupon: { code: string } | null; errors: string[] };
type Method = { id: string; label: string; hint: string };

const UFS = "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ");

function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
function maskCep(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}
function maskCpf(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

type Me = { name: string; email: string; phone: string; cpf: string; address: Address | null };

export function CheckoutForm({ shipping, methods, customer: me }: { shipping: ShippingOption[]; methods: Method[]; customer: Me | null }) {
  const { items, ready, clear } = useCart();
  const [customer, setCustomer] = useState({ name: me?.name ?? "", email: me?.email ?? "", phone: me?.phone ?? "", cpf: me?.cpf ?? "" });
  const [addr, setAddr] = useState(me?.address ?? { cep: "", street: "", number: "", complement: "", district: "", city: "", state: "" });
  const [shippingId, setShippingId] = useState(shipping[0]?.id ?? "");
  const [payment, setPayment] = useState(methods[0]?.id ?? "");
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState("");
  const [notes, setNotes] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const numberRef = useRef<HTMLInputElement>(null);
  const tracked = useRef(false);

  const ship = shipping.find((o) => o.id === shippingId);
  const cartPayload = items.map((i) => ({ productId: i.productId, qty: i.qty, options: i.options }));

  useEffect(() => {
    if (ready && items.length && !tracked.current) {
      tracked.current = true;
      track("checkout");
    }
  }, [ready, items.length]);

  useEffect(() => {
    if (!ready || !items.length) return;
    const ctrl = new AbortController();
    fetch("/api/checkout/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: cartPayload, coupon, shippingId, payment }),
      signal: ctrl.signal,
    })
      .then((r) => r.json())
      .then(setQuote)
      .catch(() => {});
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, JSON.stringify(cartPayload), coupon, shippingId, payment]);

  async function lookupCep(v: string) {
    const d = v.replace(/\D/g, "");
    if (d.length !== 8) return;
    try {
      const r = await fetch(`https://viacep.com.br/ws/${d}/json/`);
      const j = await r.json();
      if (!j.erro) {
        setAddr((a) => ({ ...a, street: j.logradouro || a.street, district: j.bairro || a.district, city: j.localidade || a.city, state: j.uf || a.state }));
        numberRef.current?.focus();
      }
    } catch {}
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const r = await fetch("/api/checkout/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: cartPayload, customer, address: ship?.requires_address ? addr : null, shippingId, coupon, payment, notes }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Não foi possível finalizar.");
      clear();
      window.location.href = j.redirect;
    } catch (err: any) {
      setError(err.message);
      setBusy(false);
    }
  }

  if (!ready) return null;
  if (!items.length)
    return (
      <div className="empty" style={{ marginBottom: 64 }}>
        <p style={{ marginBottom: 18 }}>Seu carrinho está vazio.</p>
        <Link href="/produtos" className="btn">Ver produtos</Link>
      </div>
    );

  return (
    <form className="cart-layout" onSubmit={submit}>
      <div className="stack" style={{ gap: 18 }}>
        <div className="card form-sec">
          <h3 className="steps-title"><span>1</span> Seus dados</h3>
          {me ? (
            <span className="small muted">Comprando como <strong style={{ color: "var(--text)" }}>{me.email}</strong>. O pedido fica salvo em <Link href="/minha-conta" className="link">Minha conta</Link>.</span>
          ) : (
            <span className="small muted">Já tem conta? <Link href="/entrar?next=/checkout" className="link">Entrar</Link> para preencher seus dados e acompanhar o pedido. Ou continue sem cadastro.</span>
          )}
          <label className="field">Nome completo<input type="text" required value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} autoComplete="name" /></label>
          <div className="grid-2">
            <label className="field">E-mail<input type="email" required readOnly={!!me} value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} autoComplete="email" /></label>
            <label className="field">WhatsApp<input type="tel" required value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: maskPhone(e.target.value) })} autoComplete="tel" placeholder="(11) 99999-9999" /></label>
          </div>
          <label className="field">CPF (para nota e envio)<input type="text" inputMode="numeric" value={customer.cpf} onChange={(e) => setCustomer({ ...customer, cpf: maskCpf(e.target.value) })} placeholder="000.000.000-00" /></label>
        </div>

        <div className="card form-sec">
          <h3 className="steps-title"><span>2</span> Entrega</h3>
          {shipping.map((o) => (
            <label className="choice" key={o.id}>
              <input type="radio" name="ship" checked={shippingId === o.id} onChange={() => setShippingId(o.id)} />
              <div className="grow">
                <div className="row between"><strong>{o.name}</strong><span>{quote && shippingId === o.id ? (quote.shipping_cents ? brl(quote.shipping_cents) : "Grátis") : o.price_cents ? brl(o.price_cents) : "Grátis"}</span></div>
                <span className="small muted">{o.days}</span>
              </div>
            </label>
          ))}
          {ship?.requires_address && (
            <>
              <div className="grid-3">
                <label className="field">CEP<input type="text" inputMode="numeric" required value={addr.cep} onChange={(e) => { const v = maskCep(e.target.value); setAddr({ ...addr, cep: v }); lookupCep(v); }} placeholder="00000-000" autoComplete="postal-code" /></label>
              </div>
              <div className="grid-2">
                <label className="field">Rua<input type="text" required value={addr.street} onChange={(e) => setAddr({ ...addr, street: e.target.value })} /></label>
                <div className="grid-2">
                  <label className="field">Número<input ref={numberRef} type="text" required value={addr.number} onChange={(e) => setAddr({ ...addr, number: e.target.value })} /></label>
                  <label className="field">Complemento<input type="text" value={addr.complement} onChange={(e) => setAddr({ ...addr, complement: e.target.value })} /></label>
                </div>
              </div>
              <div className="grid-3">
                <label className="field">Bairro<input type="text" required value={addr.district} onChange={(e) => setAddr({ ...addr, district: e.target.value })} /></label>
                <label className="field">Cidade<input type="text" required value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} /></label>
                <label className="field">Estado
                  <select required value={addr.state} onChange={(e) => setAddr({ ...addr, state: e.target.value })}>
                    <option value="">UF</option>
                    {UFS.map((u) => <option key={u}>{u}</option>)}
                  </select>
                </label>
              </div>
            </>
          )}
        </div>

        <div className="card form-sec">
          <h3 className="steps-title"><span>3</span> Pagamento</h3>
          {methods.length === 0 ? (
            <div className="alert bad">Nenhuma forma de pagamento configurada. Configure no painel admin, em Frete e pagamento.</div>
          ) : (
            methods.map((m) => (
              <label className="choice" key={m.id}>
                <input type="radio" name="pay" checked={payment === m.id} onChange={() => setPayment(m.id)} />
                <div><strong>{m.label}</strong><div className="small muted">{m.hint}</div></div>
              </label>
            ))
          )}
          <label className="field">Observações (opcional)<textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Algum detalhe sobre o pedido?" style={{ minHeight: 70 }} /></label>
        </div>
      </div>

      <div className="card summary">
        <h3 style={{ fontSize: 18 }}>Resumo</h3>
        {items.map((i) => (
          <div className="line" key={i.key}>
            <span>{i.qty}× {i.name}{Object.values(i.options).length ? ` (${Object.values(i.options).join(", ")})` : ""}</span>
            <span>{brl(i.unit_cents * i.qty)}</span>
          </div>
        ))}
        <div className="row" style={{ gap: 8 }}>
          <input type="text" placeholder="Cupom de desconto" value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} style={{ height: 40 }} />
          <button type="button" className="btn ghost sm" onClick={() => setCoupon(couponInput.trim())}>Aplicar</button>
        </div>
        {coupon && quote?.coupon_error && <span className="small" style={{ color: "var(--bad)" }}>{quote.coupon_error}</span>}
        {coupon && quote?.coupon && <span className="small" style={{ color: "var(--ok)" }}>Cupom {quote.coupon.code} aplicado</span>}
        {quote && (
          <>
            <div className="line"><span>Subtotal</span><span>{brl(quote.subtotal_cents)}</span></div>
            <div className="line"><span>Frete</span><span>{quote.shipping_cents ? brl(quote.shipping_cents) : "Grátis"}</span></div>
            {quote.discount_cents > 0 && <div className="line" style={{ color: "var(--ok)" }}><span>Descontos</span><span>−{brl(quote.discount_cents)}</span></div>}
            <div className="total"><span>Total</span><span>{brl(quote.total_cents)}</span></div>
            {quote.errors.map((e) => <div className="alert bad" key={e}>{e}</div>)}
          </>
        )}
        {error && <div className="alert bad">{error}</div>}
        <button className="btn block" disabled={busy || !methods.length || !!quote?.errors.length}>{busy ? "Processando…" : payment === "mercadopago" ? "Ir para o pagamento" : "Confirmar pedido"}</button>
        <span className="small dim center">Seus dados são usados apenas para processar o pedido.</span>
      </div>
    </form>
  );
}
