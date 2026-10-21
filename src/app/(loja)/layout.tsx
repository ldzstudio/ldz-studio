import Link from "next/link";
import { CartProvider } from "@/components/cart";
import { CartToast, Header, PageTracker } from "@/components/store-chrome";
import { IconWhats } from "@/components/icons";
import { getSettings, whatsappLink } from "@/lib/settings";
import { listCategories } from "@/lib/catalog";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [s, cats] = await Promise.all([getSettings(), listCategories()]);
  const wa = whatsappLink(s.contact.whatsapp, `Olá! Vim pelo site da ${s.store_name}.`);
  const ig = s.contact.instagram.replace(/^@/, "");
  return (
    <CartProvider>
      {s.announcement && <div className="announce">{s.announcement}</div>}
      <Header name={s.store_name} />
      <main>{children}</main>
      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div className="stack">
              <div className="brand">
                <img src="/mascote.png" alt="" />
                <span style={{ color: "var(--text)" }}>{s.store_name}</span>
              </div>
              <p>{s.footer_text}</p>
              {s.contact.city && <p className="dim">{s.contact.city}</p>}
            </div>
            <div>
              <h4>Loja</h4>
              <ul>
                <li><Link href="/produtos">Todos os produtos</Link></li>
                {cats.map((c) => (
                  <li key={c.id}><Link href={`/produtos?categoria=${c.slug}`}>{c.name}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h4>Atendimento</h4>
              <ul>
                {wa && <li><a href={wa} target="_blank" rel="noopener">WhatsApp</a></li>}
                {s.contact.email && <li><a href={`mailto:${s.contact.email}`}>{s.contact.email}</a></li>}
                {ig && <li><a href={`https://instagram.com/${ig}`} target="_blank" rel="noopener">Instagram @{ig}</a></li>}
                {s.contact.tiktok && <li><a href={`https://tiktok.com/@${s.contact.tiktok.replace(/^@/, "")}`} target="_blank" rel="noopener">TikTok</a></li>}
                {s.pages.map((p) => (
                  <li key={p.slug}><Link href={`/pagina/${p.slug}`}>{p.title}</Link></li>
                ))}
              </ul>
            </div>
          </div>
          <div className="bottom">
            <span>© {new Date().getFullYear()} {s.store_name}. Todos os direitos reservados.</span>
            <span>Pagamento seguro · Pix · Cartão</span>
          </div>
        </div>
      </footer>
      {wa && (
        <a className="wa-float" href={wa} target="_blank" rel="noopener" aria-label="Falar no WhatsApp">
          <IconWhats />
        </a>
      )}
      <CartToast />
      <PageTracker />
    </CartProvider>
  );
}
