import { ActionForm } from "@/components/action-form";
import { q } from "@/lib/db";
import { brl, dateTime } from "@/lib/format";
import { whatsappLink } from "@/lib/settings";
import { deleteCustomer, resetCustomerPassword } from "../../actions";

type Row = { id: number; name: string; email: string; phone: string; cpf: string; created_at: string; last_login_at: string | null; orders: number; spent: number };

export default async function AdminCustomers({ searchParams }: { searchParams: Promise<{ busca?: string }> }) {
  const { busca } = await searchParams;
  const rows = await q<Row>(
    `select c.*,
       (select count(*)::int from orders o where o.customer_id=c.id) orders,
       coalesce((select sum(total_cents) from orders o where o.customer_id=c.id and o.status in ('paid','production','shipped','delivered')),0)::int spent
     from customers c ${busca ? "where c.name ilike $1 or c.email ilike $1 or c.phone ilike $1" : ""}
     order by c.created_at desc limit 500`,
    busca ? [`%${busca}%`] : [],
  );
  const total = await q<{ n: number; d30: number }>("select count(*)::int n, count(*) filter (where created_at >= now() - interval '30 days')::int d30 from customers");
  return (
    <>
      <div className="adm-top">
        <div>
          <h1>Clientes</h1>
          <p className="small muted" style={{ marginTop: 6 }}>{total[0]?.n ?? 0} contas · {total[0]?.d30 ?? 0} novas nos últimos 30 dias</p>
        </div>
        <form action="/admin/clientes"><input type="search" name="busca" placeholder="Nome, e-mail ou telefone" defaultValue={busca ?? ""} style={{ height: 40 }} /></form>
      </div>
      {rows.length === 0 ? (
        <div className="empty">Nenhum cliente cadastrado ainda.</div>
      ) : (
        <div className="stack">
          {rows.map((c) => (
            <details className="card" key={c.id}>
              <summary className="row between wrap" style={{ cursor: "pointer", listStyle: "none" }}>
                <span><strong>{c.name}</strong> <span className="small muted">· {c.email}{c.phone ? ` · ${c.phone}` : ""}</span></span>
                <span className="small muted">{c.orders} pedido(s) · <strong style={{ color: "var(--text)" }}>{brl(c.spent)}</strong></span>
              </summary>
              <div className="stack" style={{ marginTop: 16 }}>
                <div className="small muted">
                  Conta criada em {dateTime(c.created_at)}{c.last_login_at ? ` · último acesso ${dateTime(c.last_login_at)}` : ""}{c.cpf ? ` · CPF ${c.cpf}` : ""}
                </div>
                <div className="row wrap">
                  <a href={`/admin/pedidos?busca=${encodeURIComponent(c.email)}`} className="btn ghost sm">Ver pedidos</a>
                  {c.phone && <a href={whatsappLink(c.phone)} target="_blank" rel="noopener" className="btn ghost sm">WhatsApp</a>}
                </div>
                <ActionForm action={resetCustomerPassword} submit="Definir nova senha" className="row wrap" resetOnSuccess>
                  <input type="hidden" name="id" value={c.id} />
                  <input type="text" name="password" placeholder="Nova senha para o cliente (mín. 8)" minLength={8} required style={{ maxWidth: 320 }} />
                </ActionForm>
                <form action={deleteCustomer.bind(null, c.id)}><button className="btn danger sm">Excluir conta</button></form>
              </div>
            </details>
          ))}
        </div>
      )}
    </>
  );
}
