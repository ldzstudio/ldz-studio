import { ActionForm } from "@/components/action-form";
import { q } from "@/lib/db";
import { brl, centsToInput } from "@/lib/format";
import type { Coupon } from "@/lib/orders";
import { deleteCoupon, saveCoupon } from "../../actions";

function Fields({ c }: { c?: Coupon }) {
  return (
    <>
      {c && <input type="hidden" name="original" value={c.code} />}
      <div className="grid-3">
        <label className="field">Código<input type="text" name="code" defaultValue={c?.code} required placeholder="PROMO10" style={{ textTransform: "uppercase" }} /></label>
        <label className="field">Tipo
          <select name="type" defaultValue={c?.type ?? "percent"}>
            <option value="percent">% de desconto</option>
            <option value="fixed">Valor fixo (R$)</option>
            <option value="shipping">Frete grátis</option>
          </select>
        </label>
        <label className="field">Valor (% ou R$)<input type="text" name="value" defaultValue={c ? (c.type === "fixed" ? centsToInput(c.value) : String(c.value)) : ""} placeholder="10" /></label>
      </div>
      <div className="grid-3">
        <label className="field">Compra mínima (R$)<input type="text" name="min" defaultValue={c?.min_cents ? centsToInput(c.min_cents) : ""} placeholder="0,00" /></label>
        <label className="field">Limite de usos<input type="number" name="max_uses" defaultValue={c?.max_uses ?? ""} placeholder="ilimitado" /></label>
        <label className="field">Válido até<input type="date" name="expires_at" defaultValue={c?.expires_at ? new Date(c.expires_at).toISOString().slice(0, 10) : ""} /></label>
      </div>
      <label className="check"><input type="checkbox" name="active" defaultChecked={c?.active ?? true} /> Ativo</label>
    </>
  );
}

export default async function AdminCoupons() {
  const coupons = await q<Coupon>("select * from coupons order by created_at desc");
  return (
    <>
      <div className="adm-top"><h1>Cupons de desconto</h1></div>
      <div className="stack">
        <div className="card">
          <h2>Novo cupom</h2>
          <ActionForm action={saveCoupon} submit="Criar cupom" resetOnSuccess><Fields /></ActionForm>
        </div>
        {coupons.map((c) => (
          <details className="card" key={c.code}>
            <summary className="row between" style={{ cursor: "pointer", listStyle: "none" }}>
              <span>
                <strong>{c.code}</strong>{" "}
                <span className="small muted">
                  · {c.type === "percent" ? `${c.value}% off` : c.type === "fixed" ? `${brl(c.value)} off` : "frete grátis"}
                  {c.min_cents ? ` acima de ${brl(c.min_cents)}` : ""} · usado {c.uses}{c.max_uses != null ? `/${c.max_uses}` : ""}×
                </span>
              </span>
              <span className={`badge ${c.active ? "ok" : ""}`}>{c.active ? "Ativo" : "Inativo"}</span>
            </summary>
            <div style={{ marginTop: 16 }}>
              <ActionForm action={saveCoupon}><Fields c={c} /></ActionForm>
              <form action={deleteCoupon.bind(null, c.code)} style={{ marginTop: 12 }}><button className="btn danger sm">Excluir cupom</button></form>
            </div>
          </details>
        ))}
      </div>
    </>
  );
}
