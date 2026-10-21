import Link from "next/link";
import type { Metadata } from "next";
import { ProductCard } from "@/components/product-card";
import { listCategories, listProducts } from "@/lib/catalog";

export const metadata: Metadata = { title: "Produtos" };

type SP = Promise<{ categoria?: string; busca?: string; ordem?: string }>;

export default async function Produtos({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const [cats, products] = await Promise.all([
    listCategories(),
    listProducts({ category: sp.categoria, search: sp.busca?.slice(0, 80), sort: sp.ordem }),
  ]);
  const current = cats.find((c) => c.slug === sp.categoria);
  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { categoria: sp.categoria, busca: sp.busca, ordem: sp.ordem, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/produtos?${s}` : "/produtos";
  };
  return (
    <div className="container">
      <div className="page-head">
        <span className="eyebrow">Loja</span>
        <h1>{current?.name ?? "Todos os produtos"}</h1>
        {current?.description && <p className="muted" style={{ marginTop: 10 }}>{current.description}</p>}
      </div>
      <div className="filters">
        <Link href={qs({ categoria: undefined })} className={`chip ${!sp.categoria ? "on" : ""}`}>Todos</Link>
        {cats.map((c) => (
          <Link key={c.id} href={qs({ categoria: c.slug })} className={`chip ${sp.categoria === c.slug ? "on" : ""}`}>{c.name}</Link>
        ))}
        <form action="/produtos">
          {sp.categoria && <input type="hidden" name="categoria" value={sp.categoria} />}
          <input type="search" name="busca" placeholder="Buscar…" defaultValue={sp.busca ?? ""} />
          <select name="ordem" defaultValue={sp.ordem ?? ""}>
            <option value="">Relevância</option>
            <option value="novidades">Novidades</option>
            <option value="menor-preco">Menor preço</option>
            <option value="maior-preco">Maior preço</option>
          </select>
          <button className="btn sm">Filtrar</button>
        </form>
      </div>
      {products.length ? (
        <div className="products" style={{ marginBottom: 64 }}>{products.map((p) => <ProductCard key={p.id} p={p} />)}</div>
      ) : (
        <div className="empty" style={{ marginBottom: 64 }}>Nenhum produto encontrado.</div>
      )}
    </div>
  );
}
