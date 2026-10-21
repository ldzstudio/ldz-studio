import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { IconArrow } from "@/components/icons";
import { listCategories, listProducts } from "@/lib/catalog";
import { imgSrc } from "@/lib/format";
import { getSettings, whatsappLink } from "@/lib/settings";

export default async function Home() {
  const [s, featured, cats] = await Promise.all([getSettings(), listProducts({ featured: true, limit: 8 }), listCategories()]);
  const products = featured.length ? featured : await listProducts({ limit: 8 });
  const wa = whatsappLink(s.contact.whatsapp, "Olá! Quero fazer um orçamento de uma peça personalizada.");
  return (
    <>
      <section className="hero">
        <div className="poly-bg" />
        <div className="container">
          <div>
            <span className="kicker">{s.hero.kicker}</span>
            <h1>{s.hero.title}</h1>
            <p className="lead">{s.hero.subtitle}</p>
            <div className="row wrap">
              <Link href={s.hero.cta_link || "/produtos"} className="btn">{s.hero.cta_label}</Link>
              {wa && <a href={wa} target="_blank" rel="noopener" className="btn ghost">Pedir orçamento</a>}
            </div>
          </div>
          <div className="hero-art">
            {s.hero.image ? <img className="photo" src={imgSrc(s.hero.image)} alt="" /> : <img src="/mascote.png" alt={s.store_name} />}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">Destaques</span>
              <h2>Mais procurados</h2>
            </div>
            <Link href="/produtos" className="btn ghost sm">Ver todos</Link>
          </div>
          {products.length ? (
            <div className="products">{products.map((p) => <ProductCard key={p.id} p={p} />)}</div>
          ) : (
            <div className="empty">Nenhum produto cadastrado ainda.</div>
          )}
        </div>
      </section>

      {cats.length > 0 && (
        <section className="section alt">
          <div className="container">
            <div className="section-head">
              <div>
                <span className="eyebrow">Categorias</span>
                <h2>Explore por estilo</h2>
              </div>
            </div>
            <div className="cats">
              {cats.map((c) => (
                <Link key={c.id} href={`/produtos?categoria=${c.slug}`} className="cat">
                  <span className="arrow"><IconArrow /></span>
                  <h3>{c.name}</h3>
                  <p className="muted small">{c.description || `${c.count} produtos`}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {s.steps.length > 0 && (
        <section className="section" id="como-funciona">
          <div className="container">
            <div className="section-head">
              <div>
                <span className="eyebrow">Processo</span>
                <h2>{s.steps_title}</h2>
              </div>
            </div>
            <div className="steps">
              {s.steps.map((st, i) => (
                <div className="step" key={i}>
                  <h3>{st.title}</h3>
                  <p className="muted">{st.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="section alt" id="sobre">
        <div className="container about">
          <img src="/mascote.png" alt="" />
          <div className="stack">
            <span className="eyebrow">Quem somos</span>
            <h2 style={{ fontSize: "clamp(28px,4vw,40px)" }}>{s.about_title}</h2>
            <p className="muted" style={{ fontSize: 17, whiteSpace: "pre-line" }}>{s.about_text}</p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="cta-band">
            <div>
              <h2>{s.custom_cta.title}</h2>
              <p className="muted">{s.custom_cta.text}</p>
            </div>
            {wa ? (
              <a href={wa} target="_blank" rel="noopener" className="btn">{s.custom_cta.button}</a>
            ) : (
              <Link href="/produtos?categoria=sob-medida" className="btn">{s.custom_cta.button}</Link>
            )}
          </div>
        </div>
      </section>

      {s.faq.length > 0 && (
        <section className="section" id="duvidas" style={{ paddingTop: 0 }}>
          <div className="container" style={{ maxWidth: 820 }}>
            <div className="section-head">
              <div>
                <span className="eyebrow">FAQ</span>
                <h2>Dúvidas frequentes</h2>
              </div>
            </div>
            <div className="faq">
              {s.faq.map((f, i) => (
                <details key={i}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
