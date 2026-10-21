"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImageUploader } from "@/components/image-uploader";
import { saveProduct, type ProductInput } from "../../../actions";

export function ProductForm({ initial, categories }: { initial: ProductInput; categories: { id: number; name: string }[] }) {
  const [f, setF] = useState<ProductInput>(initial);
  const [msg, setMsg] = useState<{ ok?: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const set = <K extends keyof ProductInput>(k: K, v: ProductInput[K]) => setF((p) => ({ ...p, [k]: v }));

  const setOpt = (i: number, patch: Partial<ProductInput["options"][number]>) =>
    set("options", f.options.map((o, k) => (k === i ? { ...o, ...patch } : o)));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    start(async () => {
      const r = await saveProduct(f);
      if (r?.error) return setMsg({ text: r.error });
      setMsg({ ok: true, text: r?.message ?? "Salvo" });
      if (!f.id && r?.id) router.replace(`/admin/produtos/${r.id}`);
      else router.refresh();
    });
  }

  return (
    <form onSubmit={submit}>
      <div className="adm-grid" style={{ alignItems: "start" }}>
        <div className="stack">
          <div className="card form-sec">
            <label className="field">Nome do produto<input type="text" value={f.name} onChange={(e) => set("name", e.target.value)} required /></label>
            <label className="field">Resumo (aparece abaixo do nome)<input type="text" value={f.short_description} onChange={(e) => set("short_description", e.target.value)} maxLength={200} /></label>
            <label className="field">Descrição completa<textarea value={f.description} onChange={(e) => set("description", e.target.value)} rows={7} /></label>
          </div>
          <div className="card form-sec">
            <h2 style={{ margin: 0 }}>Fotos</h2>
            <ImageUploader value={f.images} onChange={(v) => set("images", v)} />
            <span className="small dim">A primeira foto é a capa. JPG, PNG ou WEBP até 6 MB.</span>
          </div>
          <div className="card form-sec">
            <div className="row between"><h2 style={{ margin: 0 }}>Variações</h2><button type="button" className="btn ghost sm" onClick={() => set("options", [...f.options, { name: "", values: [{ label: "", delta: "" }] }])}>+ Variação</button></div>
            <span className="small dim">Ex.: Cor (Preto, Branco), Tamanho (15 cm, 25 cm +R$ 40,00). O acréscimo é somado ao preço.</span>
            {f.options.map((o, i) => (
              <div className="repeat-row" key={i}>
                <div className="row">
                  <input type="text" placeholder="Nome (ex.: Cor)" value={o.name} onChange={(e) => setOpt(i, { name: e.target.value })} />
                  <button type="button" className="btn danger sm" onClick={() => set("options", f.options.filter((_, k) => k !== i))}>Remover</button>
                </div>
                {o.values.map((v, j) => (
                  <div className="row" key={j}>
                    <input type="text" placeholder="Opção (ex.: Preto)" value={v.label} onChange={(e) => setOpt(i, { values: o.values.map((x, k) => (k === j ? { ...x, label: e.target.value } : x)) })} />
                    <input type="text" inputMode="decimal" placeholder="+ R$ 0,00" value={v.delta} style={{ maxWidth: 130 }} onChange={(e) => setOpt(i, { values: o.values.map((x, k) => (k === j ? { ...x, delta: e.target.value } : x)) })} />
                    <button type="button" className="link small" onClick={() => setOpt(i, { values: o.values.filter((_, k) => k !== j) })}>✕</button>
                  </div>
                ))}
                <button type="button" className="link small" style={{ justifySelf: "start" }} onClick={() => setOpt(i, { values: [...o.values, { label: "", delta: "" }] })}>+ opção</button>
              </div>
            ))}
          </div>
        </div>
        <div className="stack">
          <div className="card form-sec">
            <label className="check"><input type="checkbox" checked={f.active} onChange={(e) => set("active", e.target.checked)} /> Ativo (visível na loja)</label>
            <label className="check"><input type="checkbox" checked={f.featured} onChange={(e) => set("featured", e.target.checked)} /> Destaque na página inicial</label>
            <label className="field">Categoria
              <select value={f.category_id} onChange={(e) => set("category_id", e.target.value)}>
                <option value="">Sem categoria</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
          </div>
          <div className="card form-sec">
            <h2 style={{ margin: 0 }}>Preço</h2>
            <label className="field">Preço de venda (R$)<input type="text" inputMode="decimal" value={f.price} onChange={(e) => set("price", e.target.value)} placeholder="59,90" required /></label>
            <label className="field">Preço “de” riscado (opcional)<input type="text" inputMode="decimal" value={f.compare_at} onChange={(e) => set("compare_at", e.target.value)} placeholder="79,90" /></label>
            <label className="field">Custo de produção (só você vê)<input type="text" inputMode="decimal" value={f.cost} onChange={(e) => set("cost", e.target.value)} placeholder="15,00" /></label>
          </div>
          <div className="card form-sec">
            <h2 style={{ margin: 0 }}>Estoque e produção</h2>
            <label className="field">Estoque (vazio = sob encomenda, sem limite)<input type="number" min={0} value={f.stock} onChange={(e) => set("stock", e.target.value)} /></label>
            <div className="grid-2">
              <label className="field">Prazo de produção (dias)<input type="number" min={0} value={f.production_days} onChange={(e) => set("production_days", e.target.value)} /></label>
              <label className="field">Peso (g)<input type="number" min={0} value={f.weight_g} onChange={(e) => set("weight_g", e.target.value)} /></label>
            </div>
          </div>
          <div className="card form-sec">
            <h2 style={{ margin: 0 }}>Avançado</h2>
            <label className="field">Endereço (slug)<input type="text" value={f.slug} onChange={(e) => set("slug", e.target.value)} placeholder="gerado a partir do nome" /></label>
            <label className="field">Ordem de exibição<input type="number" value={f.sort} onChange={(e) => set("sort", e.target.value)} /></label>
          </div>
        </div>
      </div>
      <div className="sticky-save">
        {msg && <div className={`alert ${msg.ok ? "ok" : "bad"}`}>{msg.text}</div>}
        <button className="btn" disabled={pending}>{pending ? "Salvando…" : "Salvar produto"}</button>
      </div>
    </form>
  );
}
