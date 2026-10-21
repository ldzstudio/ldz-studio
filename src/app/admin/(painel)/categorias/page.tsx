import { ActionForm } from "@/components/action-form";
import { listCategories } from "@/lib/catalog";
import { deleteCategory, saveCategory } from "../../actions";

function Fields({ c }: { c?: { id: number; name: string; slug: string; description: string; sort: number; active: boolean } }) {
  return (
    <>
      {c && <input type="hidden" name="id" value={c.id} />}
      <div className="grid-3">
        <label className="field">Nome<input type="text" name="name" defaultValue={c?.name} required /></label>
        <label className="field">Endereço (slug)<input type="text" name="slug" defaultValue={c?.slug} placeholder="automático" /></label>
        <label className="field">Ordem<input type="number" name="sort" defaultValue={c?.sort ?? 0} /></label>
      </div>
      <label className="field">Descrição<input type="text" name="description" defaultValue={c?.description} /></label>
      <label className="check"><input type="checkbox" name="active" defaultChecked={c?.active ?? true} /> Visível na loja</label>
    </>
  );
}

export default async function AdminCategories() {
  const cats = await listCategories(false);
  return (
    <>
      <div className="adm-top"><h1>Categorias</h1></div>
      <div className="stack">
        <div className="card">
          <h2>Nova categoria</h2>
          <ActionForm action={saveCategory} submit="Criar categoria" resetOnSuccess><Fields /></ActionForm>
        </div>
        {cats.map((c) => (
          <details className="card" key={c.id}>
            <summary className="row between" style={{ cursor: "pointer", listStyle: "none" }}>
              <span><strong>{c.name}</strong> <span className="small dim">· {c.count} produto(s) ativos {c.active ? "" : "· oculta"}</span></span>
              <span className="small muted">Editar</span>
            </summary>
            <div style={{ marginTop: 16 }}>
              <ActionForm action={saveCategory}><Fields c={c} /></ActionForm>
              <form action={deleteCategory.bind(null, c.id)} style={{ marginTop: 12 }}><button className="btn danger sm">Excluir categoria</button></form>
            </div>
          </details>
        ))}
      </div>
    </>
  );
}
