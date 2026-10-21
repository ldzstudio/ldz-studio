"use client";
import { useState, useTransition } from "react";
import { ImageUploader } from "@/components/image-uploader";
import { slugify } from "@/lib/format";
import type { SiteSettings } from "@/lib/settings";
import { saveSiteSettings } from "../../actions";

type Editable = Pick<SiteSettings, "store_name" | "tagline" | "seo_description" | "announcement" | "accent" | "hero" | "steps_title" | "steps" | "about_title" | "about_text" | "custom_cta" | "faq" | "pages" | "contact" | "footer_text">;

export function ContentForm({ initial }: { initial: SiteSettings }) {
  const [s, setS] = useState<Editable>(() => {
    const { store_name, tagline, seo_description, announcement, accent, hero, steps_title, steps, about_title, about_text, custom_cta, faq, pages, contact, footer_text } = initial;
    return { store_name, tagline, seo_description, announcement, accent, hero, steps_title, steps, about_title, about_text, custom_cta, faq, pages, contact, footer_text };
  });
  const [msg, setMsg] = useState<{ ok?: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof Editable>(k: K, v: Editable[K]) => setS((p) => ({ ...p, [k]: v }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const pages = s.pages.map((p) => ({ ...p, slug: slugify(p.slug || p.title) })).filter((p) => p.title && p.slug);
      const r = await saveSiteSettings({ ...s, pages });
      setMsg(r?.error ? { text: r.error } : { ok: true, text: r?.message ?? "Salvo" });
    });
  }

  function List<T>({ items, onChange, blank, render, addLabel }: { items: T[]; onChange: (v: T[]) => void; blank: T; render: (item: T, update: (patch: Partial<T>) => void) => React.ReactNode; addLabel: string }) {
    return (
      <div className="stack" style={{ gap: 10 }}>
        {items.map((it, i) => (
          <div className="repeat-row" key={i}>
            {render(it, (patch) => onChange(items.map((x, k) => (k === i ? { ...x, ...patch } : x))))}
            <div className="row">
              <button type="button" className="link small" onClick={() => i > 0 && onChange(items.map((x, k) => (k === i - 1 ? items[i] : k === i ? items[i - 1] : x)))}>↑ Subir</button>
              <button type="button" className="link small" style={{ color: "var(--bad)" }} onClick={() => onChange(items.filter((_, k) => k !== i))}>Remover</button>
            </div>
          </div>
        ))}
        <button type="button" className="btn ghost sm" style={{ justifySelf: "start" }} onClick={() => onChange([...items, { ...blank }])}>{addLabel}</button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="stack">
      <div className="card form-sec">
        <h2 style={{ margin: 0 }}>Identidade</h2>
        <div className="grid-2">
          <label className="field">Nome da loja<input type="text" value={s.store_name} onChange={(e) => set("store_name", e.target.value)} /></label>
          <label className="field">Slogan<input type="text" value={s.tagline} onChange={(e) => set("tagline", e.target.value)} /></label>
        </div>
        <label className="field">Descrição para o Google (SEO)<textarea value={s.seo_description} onChange={(e) => set("seo_description", e.target.value)} style={{ minHeight: 64 }} /></label>
        <label className="field">Barra de aviso no topo (vazio = esconder)<input type="text" value={s.announcement} onChange={(e) => set("announcement", e.target.value)} /></label>
        <label className="field">Cor de destaque (botões)
          <div className="row"><input type="color" value={s.accent} onChange={(e) => set("accent", e.target.value)} /><input type="text" value={s.accent} onChange={(e) => set("accent", e.target.value)} style={{ maxWidth: 140 }} /><button type="button" className="link small" onClick={() => set("accent", "#ffffff")}>Voltar ao branco</button></div>
        </label>
      </div>

      <div className="card form-sec">
        <h2 style={{ margin: 0 }}>Banner principal</h2>
        <label className="field">Texto pequeno acima do título<input type="text" value={s.hero.kicker} onChange={(e) => set("hero", { ...s.hero, kicker: e.target.value })} /></label>
        <label className="field">Título<input type="text" value={s.hero.title} onChange={(e) => set("hero", { ...s.hero, title: e.target.value })} /></label>
        <label className="field">Subtítulo<textarea value={s.hero.subtitle} onChange={(e) => set("hero", { ...s.hero, subtitle: e.target.value })} style={{ minHeight: 64 }} /></label>
        <div className="grid-2">
          <label className="field">Texto do botão<input type="text" value={s.hero.cta_label} onChange={(e) => set("hero", { ...s.hero, cta_label: e.target.value })} /></label>
          <label className="field">Link do botão<input type="text" value={s.hero.cta_link} onChange={(e) => set("hero", { ...s.hero, cta_link: e.target.value })} /></label>
        </div>
        <div className="field" style={{ fontSize: 13, color: "var(--muted)" }}>Imagem do banner (vazio = mascote da LDZ)
          <ImageUploader max={1} value={s.hero.image ? [s.hero.image] : []} onChange={(v) => set("hero", { ...s.hero, image: v[0] ?? "" })} />
        </div>
      </div>

      <div className="card form-sec">
        <h2 style={{ margin: 0 }}>Como funciona</h2>
        <label className="field">Título da seção<input type="text" value={s.steps_title} onChange={(e) => set("steps_title", e.target.value)} /></label>
        {List({ items: s.steps, onChange: (v) => set("steps", v), blank: { title: "", text: "" }, addLabel: "+ Etapa", render: (it, up) => (<><input type="text" placeholder="Título" value={it.title} onChange={(e) => up({ title: e.target.value })} /><input type="text" placeholder="Texto" value={it.text} onChange={(e) => up({ text: e.target.value })} /></>) })}
      </div>

      <div className="card form-sec">
        <h2 style={{ margin: 0 }}>Sobre e chamada para orçamento</h2>
        <label className="field">Título do “Sobre”<input type="text" value={s.about_title} onChange={(e) => set("about_title", e.target.value)} /></label>
        <label className="field">Texto do “Sobre”<textarea value={s.about_text} onChange={(e) => set("about_text", e.target.value)} rows={5} /></label>
        <div className="grid-2">
          <label className="field">Título da chamada<input type="text" value={s.custom_cta.title} onChange={(e) => set("custom_cta", { ...s.custom_cta, title: e.target.value })} /></label>
          <label className="field">Texto do botão<input type="text" value={s.custom_cta.button} onChange={(e) => set("custom_cta", { ...s.custom_cta, button: e.target.value })} /></label>
        </div>
        <label className="field">Texto da chamada<input type="text" value={s.custom_cta.text} onChange={(e) => set("custom_cta", { ...s.custom_cta, text: e.target.value })} /></label>
      </div>

      <div className="card form-sec">
        <h2 style={{ margin: 0 }}>Perguntas frequentes</h2>
        {List({ items: s.faq, onChange: (v) => set("faq", v), blank: { q: "", a: "" }, addLabel: "+ Pergunta", render: (it, up) => (<><input type="text" placeholder="Pergunta" value={it.q} onChange={(e) => up({ q: e.target.value })} /><textarea placeholder="Resposta" value={it.a} onChange={(e) => up({ a: e.target.value })} style={{ minHeight: 64 }} /></>) })}
      </div>

      <div className="card form-sec">
        <h2 style={{ margin: 0 }}>Contato e redes</h2>
        <div className="grid-2">
          <label className="field">WhatsApp (com DDD)<input type="tel" value={s.contact.whatsapp} onChange={(e) => set("contact", { ...s.contact, whatsapp: e.target.value })} placeholder="(11) 99999-9999" /></label>
          <label className="field">E-mail<input type="email" value={s.contact.email} onChange={(e) => set("contact", { ...s.contact, email: e.target.value })} /></label>
          <label className="field">Instagram<input type="text" value={s.contact.instagram} onChange={(e) => set("contact", { ...s.contact, instagram: e.target.value })} placeholder="@ldzstudio" /></label>
          <label className="field">TikTok<input type="text" value={s.contact.tiktok} onChange={(e) => set("contact", { ...s.contact, tiktok: e.target.value })} placeholder="@ldzstudio" /></label>
        </div>
        <label className="field">Cidade / localização<input type="text" value={s.contact.city} onChange={(e) => set("contact", { ...s.contact, city: e.target.value })} /></label>
        <label className="field">Texto do rodapé<input type="text" value={s.footer_text} onChange={(e) => set("footer_text", e.target.value)} /></label>
      </div>

      <div className="card form-sec">
        <h2 style={{ margin: 0 }}>Páginas (políticas, trocas, etc.)</h2>
        {List({ items: s.pages, onChange: (v) => set("pages", v), blank: { slug: "", title: "", content: "" }, addLabel: "+ Página", render: (it, up) => (<><input type="text" placeholder="Título" value={it.title} onChange={(e) => up({ title: e.target.value })} /><textarea placeholder="Conteúdo" value={it.content} onChange={(e) => up({ content: e.target.value })} rows={5} /><span className="small dim">Endereço: /pagina/{slugify(it.slug || it.title) || "…"}</span></>) })}
      </div>

      <div className="sticky-save">
        {msg && <div className={`alert ${msg.ok ? "ok" : "bad"}`}>{msg.text}</div>}
        <button className="btn" disabled={pending}>{pending ? "Salvando…" : "Salvar e publicar"}</button>
      </div>
    </form>
  );
}
