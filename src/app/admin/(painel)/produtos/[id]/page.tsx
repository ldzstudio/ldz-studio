import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductForm } from "./form";
import { one } from "@/lib/db";
import { listCategories, type Product } from "@/lib/catalog";
import { centsToInput } from "@/lib/format";
import { deleteProduct, duplicateProduct } from "../../../actions";

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isNew = id === "novo";
  const p = isNew ? null : await one<Product>("select * from products where id=$1", [Number(id) || 0]);
  if (!isNew && !p) notFound();
  const cats = await listCategories(false);
  return (
    <>
      <div className="adm-top">
        <div>
          <Link href="/admin/produtos" className="small muted">← Produtos</Link>
          <h1 style={{ marginTop: 6 }}>{p ? p.name : "Novo produto"}</h1>
        </div>
        {p && (
          <div className="row">
            <a href={`/produto/${p.slug}`} target="_blank" className="btn ghost sm">Ver na loja ↗</a>
            <form action={duplicateProduct.bind(null, p.id)}><button className="btn ghost sm">Duplicar</button></form>
          </div>
        )}
      </div>
      <ProductForm
        categories={cats.map((c) => ({ id: c.id, name: c.name }))}
        initial={{
          id: p?.id,
          name: p?.name ?? "",
          slug: p?.slug ?? "",
          short_description: p?.short_description ?? "",
          description: p?.description ?? "",
          price: centsToInput(p?.price_cents),
          compare_at: centsToInput(p?.compare_at_cents),
          cost: centsToInput(p?.cost_cents),
          stock: p?.stock == null ? "" : String(p.stock),
          active: p?.active ?? true,
          featured: p?.featured ?? false,
          category_id: p?.category_id ? String(p.category_id) : "",
          images: p?.images ?? [],
          options: (p?.options ?? []).map((o) => ({ name: o.name, values: o.values.map((v) => ({ label: v.label, delta: v.price_delta_cents ? centsToInput(v.price_delta_cents) : "" })) })),
          production_days: String(p?.production_days ?? 3),
          weight_g: String(p?.weight_g ?? 200),
          sort: String(p?.sort ?? 0),
        }}
      />
      {p && (
        <form action={deleteProduct.bind(null, p.id)} style={{ marginTop: 32 }}>
          <button className="btn danger sm">Excluir produto</button>
          <span className="small dim" style={{ marginLeft: 12 }}>Dica: para tirar da loja sem perder o histórico, apenas desmarque “Ativo”.</span>
        </form>
      )}
    </>
  );
}
