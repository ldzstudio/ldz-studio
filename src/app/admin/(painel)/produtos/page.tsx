import Link from "next/link";
import { q } from "@/lib/db";
import { brl, imgSrc } from "@/lib/format";
import type { Product } from "@/lib/catalog";
import { toggleProduct } from "../../actions";

export default async function AdminProducts({ searchParams }: { searchParams: Promise<{ busca?: string }> }) {
  const { busca } = await searchParams;
  const products = await q<Product & { sold: number }>(
    `select p.*, c.name category_name,
       coalesce((select sum((i->>'qty')::int) from orders o, jsonb_array_elements(o.items) i
                 where o.status in ('paid','production','shipped','delivered') and (i->>'product_id')::int = p.id),0)::int sold
     from products p left join categories c on c.id=p.category_id
     ${busca ? "where p.name ilike $1" : ""} order by p.sort, p.created_at desc`,
    busca ? [`%${busca}%`] : [],
  );
  return (
    <>
      <div className="adm-top">
        <h1>Produtos</h1>
        <div className="row">
          <form action="/admin/produtos"><input type="search" name="busca" placeholder="Buscar produto…" defaultValue={busca ?? ""} style={{ height: 40 }} /></form>
          <Link href="/admin/produtos/novo" className="btn sm">+ Novo produto</Link>
        </div>
      </div>
      {products.length === 0 ? (
        <div className="empty">Nenhum produto. <Link href="/admin/produtos/novo" className="link">Cadastre o primeiro</Link>.</div>
      ) : (
        <div className="table-wrap">
          <table className="t">
            <thead><tr><th>Produto</th><th>Preço</th><th>Estoque</th><th>Vendidos</th><th>Destaque</th><th>Status</th></tr></thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/admin/produtos/${p.id}`} className="row">
                      <div className="thumb-sm">{p.images[0] ? <img src={imgSrc(p.images[0])} alt="" /> : <img src="/mascote.png" alt="" style={{ objectFit: "contain", padding: 8, opacity: .4 }} />}</div>
                      <div><div style={{ fontWeight: 600 }}>{p.name}</div><div className="small dim">{p.category_name ?? "Sem categoria"}</div></div>
                    </Link>
                  </td>
                  <td>{brl(p.price_cents)}{p.compare_at_cents ? <div className="small dim"><s>{brl(p.compare_at_cents)}</s></div> : null}</td>
                  <td>{p.stock == null ? <span className="dim">Sob encomenda</span> : <span className={`badge ${p.stock <= 0 ? "bad" : p.stock <= 3 ? "warn" : ""}`}>{p.stock}</span>}</td>
                  <td>{p.sold}</td>
                  <td><form action={toggleProduct.bind(null, p.id, "featured")}><button className="link small">{p.featured ? "★ Sim" : "☆ Não"}</button></form></td>
                  <td><form action={toggleProduct.bind(null, p.id, "active")}><button className={`badge ${p.active ? "ok" : ""}`} style={{ cursor: "pointer" }}>{p.active ? "Ativo" : "Oculto"}</button></form></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
