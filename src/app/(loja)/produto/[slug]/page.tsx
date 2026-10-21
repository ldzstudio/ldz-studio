import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BuyBox, Gallery } from "./client";
import { ProductCard } from "@/components/product-card";
import { ProductViewTracker } from "@/components/store-chrome";
import { getProductBySlug, listProducts } from "@/lib/catalog";
import { imgSrc } from "@/lib/format";
import { getSettings } from "@/lib/settings";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const p = await getProductBySlug((await params).slug);
  if (!p) return {};
  return { title: p.name, description: p.short_description, openGraph: { images: p.images[0] ? [imgSrc(p.images[0])] : ["/logo-quadrado.png"] } };
}

export default async function ProductPage({ params }: { params: Params }) {
  const p = await getProductBySlug((await params).slug);
  if (!p) notFound();
  const s = await getSettings();
  const related = (await listProducts({ category: p.category_slug ?? undefined, limit: 5 })).filter((x) => x.id !== p.id).slice(0, 4);
  return (
    <div className="container">
      <ProductViewTracker productId={p.id} />
      <div className="crumbs">
        <Link href="/">Início</Link> / <Link href="/produtos">Produtos</Link>
        {p.category_slug && <> / <Link href={`/produtos?categoria=${p.category_slug}`}>{p.category_name}</Link></>}
      </div>
      <div className="pdp">
        <Gallery images={p.images} name={p.name} />
        <BuyBox
          product={{ id: p.id, slug: p.slug, name: p.name, image: p.images[0] ?? null, price_cents: p.price_cents, compare_at_cents: p.compare_at_cents, stock: p.stock, options: p.options }}
          shortDescription={p.short_description}
          productionDays={p.production_days}
          freeAbove={s.shipping.free_above_cents}
          pixDiscount={s.payments.pix && s.payments.pix_key ? s.payments.pix_discount_percent : 0}
        />
      </div>
      {p.description && (
        <section style={{ maxWidth: 760, paddingBottom: 56 }}>
          <h2 style={{ fontSize: 24, marginBottom: 14 }}>Detalhes</h2>
          <p className="desc">{p.description}</p>
        </section>
      )}
      {related.length > 0 && (
        <section style={{ paddingBottom: 64 }}>
          <h2 style={{ fontSize: 24, marginBottom: 20 }}>Você também pode gostar</h2>
          <div className="products">{related.map((r) => <ProductCard key={r.id} p={r} />)}</div>
        </section>
      )}
    </div>
  );
}
