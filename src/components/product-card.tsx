import Link from "next/link";
import type { Product } from "@/lib/catalog";
import { brl, imgSrc } from "@/lib/format";

export function ProductImage({ src, alt }: { src?: string | null; alt: string }) {
  if (!src) {
    return (
      <div className="placeholder">
        <img src="/mascote.png" alt="" />
      </div>
    );
  }
  return <img src={imgSrc(src)} alt={alt} loading="lazy" />;
}

export function ProductCard({ p }: { p: Product }) {
  const off = p.compare_at_cents && p.compare_at_cents > p.price_cents ? Math.round((1 - p.price_cents / p.compare_at_cents) * 100) : 0;
  const soldOut = p.stock != null && p.stock <= 0;
  return (
    <Link href={`/produto/${p.slug}`} className="pcard">
      <div className="thumb">
        <ProductImage src={p.images?.[0]} alt={p.name} />
        {soldOut ? <span className="badge bad tag">Esgotado</span> : off > 0 ? <span className="badge tag" style={{ background: "var(--accent)", color: "var(--accent-ink)", borderColor: "var(--accent)" }}>-{off}%</span> : null}
      </div>
      <div className="body">
        {p.category_name && <span className="dim small">{p.category_name}</span>}
        <h3>{p.name}</h3>
        <div className="price">
          <strong>{p.options?.some((o) => o.values.some((v) => v.price_delta_cents > 0)) ? "a partir de " : ""}{brl(p.price_cents)}</strong>
          {off > 0 && <s>{brl(p.compare_at_cents)}</s>}
        </div>
      </div>
    </Link>
  );
}
