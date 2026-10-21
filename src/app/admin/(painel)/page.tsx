import Link from "next/link";
import { q, one } from "@/lib/db";
import { brl, dateTime, ORDER_STATUS } from "@/lib/format";
import type { Order } from "@/lib/orders";

const PAID = "('paid','production','shipped','delivered')";
const TZ = "America/Sao_Paulo";

function delta(cur: number, prev: number) {
  if (!prev) return cur ? { text: "novo no período", cls: "up" } : { text: "—", cls: "" };
  const d = Math.round(((cur - prev) / prev) * 100);
  return { text: `${d >= 0 ? "▲" : "▼"} ${Math.abs(d)}% vs período anterior`, cls: d >= 0 ? "up" : "down" };
}

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ dias?: string }> }) {
  const days = [7, 30, 90].includes(Number((await searchParams).dias)) ? Number((await searchParams).dias) : 30;
  const P = [days];

  const [cur, prev, visits, prevVisits, pending, series, top, funnel, refs, recent, lowStock] = await Promise.all([
    one<{ revenue: number; orders: number }>(`select coalesce(sum(total_cents),0)::int revenue, count(*)::int orders from orders where status in ${PAID} and coalesce(paid_at, created_at) >= now() - make_interval(days => $1::int)`, P),
    one<{ revenue: number; orders: number }>(`select coalesce(sum(total_cents),0)::int revenue, count(*)::int orders from orders where status in ${PAID} and coalesce(paid_at, created_at) >= now() - make_interval(days => $1::int * 2) and coalesce(paid_at, created_at) < now() - make_interval(days => $1::int)`, P),
    one<{ n: number; views: number }>(`select count(distinct session_id)::int n, count(*)::int views from events where type in ('view','product_view') and created_at >= now() - make_interval(days => $1::int)`, P),
    one<{ n: number }>(`select count(distinct session_id)::int n from events where type in ('view','product_view') and created_at >= now() - make_interval(days => $1::int * 2) and created_at < now() - make_interval(days => $1::int)`, P),
    one<{ n: number; total: number }>(`select count(*)::int n, coalesce(sum(total_cents),0)::int total from orders where status='pending'`),
    q<{ day: string; revenue: number; orders: number; visits: number }>(
      `with d as (select generate_series((now() at time zone '${TZ}')::date - ($1::int - 1), (now() at time zone '${TZ}')::date, '1 day')::date as day)
       select to_char(d.day, 'DD/MM') as day,
         coalesce((select sum(total_cents) from orders o where o.status in ${PAID} and (coalesce(o.paid_at,o.created_at) at time zone '${TZ}')::date = d.day),0)::int revenue,
         coalesce((select count(*) from orders o where o.status in ${PAID} and (coalesce(o.paid_at,o.created_at) at time zone '${TZ}')::date = d.day),0)::int orders,
         coalesce((select count(distinct session_id) from events e where e.type in ('view','product_view') and (e.created_at at time zone '${TZ}')::date = d.day),0)::int visits
       from d order by d.day`,
      P,
    ),
    q<{ name: string; qty: number; revenue: number }>(
      `select i->>'name' as name, sum((i->>'qty')::int)::int qty, sum((i->>'total_cents')::int)::int revenue
       from orders o, jsonb_array_elements(o.items) i
       where o.status in ${PAID} and o.created_at >= now() - make_interval(days => $1::int)
       group by 1 order by revenue desc limit 6`,
      P,
    ),
    one<{ viewed: number; carted: number; checkout: number }>(
      `select count(distinct session_id) filter (where type in ('view','product_view'))::int viewed,
              count(distinct session_id) filter (where type='add_to_cart')::int carted,
              count(distinct session_id) filter (where type='checkout')::int checkout
       from events where created_at >= now() - make_interval(days => $1::int)`,
      P,
    ),
    q<{ referrer: string; n: number }>(`select referrer, count(distinct session_id)::int n from events where referrer is not null and created_at >= now() - make_interval(days => $1::int) group by 1 order by 2 desc limit 6`, P),
    q<Order>(`select * from orders order by created_at desc limit 8`),
    q<{ id: number; name: string; stock: number }>(`select id, name, stock from products where active and stock is not null and stock <= 3 order by stock limit 6`),
  ]);

  const rev = cur?.revenue ?? 0;
  const orders = cur?.orders ?? 0;
  const ticket = orders ? Math.round(rev / orders) : 0;
  const prevTicket = prev?.orders ? Math.round(prev.revenue / prev.orders) : 0;
  const conv = visits?.n ? (orders / visits.n) * 100 : 0;
  const max = Math.max(1, ...series.map((s) => s.revenue));
  const fmax = Math.max(1, funnel?.viewed ?? 0);
  const funnelRows = [
    ["Visitantes", funnel?.viewed ?? 0],
    ["Adicionaram ao carrinho", funnel?.carted ?? 0],
    ["Iniciaram checkout", funnel?.checkout ?? 0],
    ["Compraram", orders],
  ] as const;

  return (
    <>
      <div className="adm-top">
        <h1>Visão geral</h1>
        <div className="row">
          {[7, 30, 90].map((d) => (
            <Link key={d} href={`/admin?dias=${d}`} className={`chip ${d === days ? "on" : ""}`}>{d} dias</Link>
          ))}
        </div>
      </div>

      <div className="kpis">
        <div className="kpi"><div className="k">Faturamento</div><div className="v">{brl(rev)}</div><div className={`d ${delta(rev, prev?.revenue ?? 0).cls}`}>{delta(rev, prev?.revenue ?? 0).text}</div></div>
        <div className="kpi"><div className="k">Pedidos pagos</div><div className="v">{orders}</div><div className={`d ${delta(orders, prev?.orders ?? 0).cls}`}>{delta(orders, prev?.orders ?? 0).text}</div></div>
        <div className="kpi"><div className="k">Ticket médio</div><div className="v">{brl(ticket)}</div><div className={`d ${delta(ticket, prevTicket).cls}`}>{delta(ticket, prevTicket).text}</div></div>
        <div className="kpi"><div className="k">Visitantes</div><div className="v">{visits?.n ?? 0}</div><div className={`d ${delta(visits?.n ?? 0, prevVisits?.n ?? 0).cls}`}>{delta(visits?.n ?? 0, prevVisits?.n ?? 0).text}</div></div>
      </div>
      <div className="kpis">
        <div className="kpi"><div className="k">Taxa de conversão</div><div className="v">{conv.toFixed(1).replace(".", ",")}%</div><div className="d">pedidos pagos ÷ visitantes</div></div>
        <div className="kpi"><div className="k">Páginas vistas</div><div className="v">{visits?.views ?? 0}</div><div className="d">no período</div></div>
        <div className="kpi"><div className="k">Aguardando pagamento</div><div className="v">{pending?.n ?? 0}</div><div className="d">{brl(pending?.total)} em aberto</div></div>
        <div className="kpi"><div className="k">Carrinhos abandonados</div><div className="v">{Math.max(0, (funnel?.checkout ?? 0) - orders)}</div><div className="d">iniciaram checkout e não pagaram</div></div>
      </div>

      <div className="adm-grid">
        <div className="card">
          <h2>Faturamento por dia</h2>
          <div className="chart">
            {series.map((s) => (
              <div key={s.day} className={`bar ${s.revenue ? "has" : ""}`} style={{ height: `${(s.revenue / max) * 100}%` }} data-tip={`${s.day}: ${brl(s.revenue)} · ${s.orders} pedido(s) · ${s.visits} visitante(s)`} />
            ))}
          </div>
          <div className="chart-x"><span>{series[0]?.day}</span><span>{series[series.length - 1]?.day}</span></div>
        </div>
        <div className="card">
          <h2>Funil de vendas</h2>
          <div className="funnel">
            {funnelRows.map(([label, n]) => (
              <div className="f-row" key={label}>
                <div className="row between"><span className="muted">{label}</span><strong>{n}</strong></div>
                <div className="f-bar"><div style={{ width: `${Math.min(100, (n / fmax) * 100)}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="adm-grid">
        <div className="card">
          <div className="row between" style={{ marginBottom: 16 }}><h2 style={{ margin: 0 }}>Últimos pedidos</h2><Link href="/admin/pedidos" className="link small">Ver todos</Link></div>
          {recent.length === 0 ? <p className="muted small">Nenhum pedido ainda.</p> : (
            <table className="t">
              <tbody>
                {recent.map((o) => (
                  <tr key={o.id}>
                    <td><Link href={`/admin/pedidos/${o.id}`} className="link">#{o.number}</Link></td>
                    <td>{o.customer.name}<div className="small dim">{dateTime(o.created_at)}</div></td>
                    <td><span className={`badge ${ORDER_STATUS[o.status]?.tone}`}>{ORDER_STATUS[o.status]?.label}</span></td>
                    <td style={{ textAlign: "right" }}><strong>{brl(o.total_cents)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="stack">
          <div className="card">
            <h2>Mais vendidos</h2>
            {top.length === 0 ? <p className="muted small">Sem vendas no período.</p> : top.map((t) => (
              <div key={t.name} className="row between small" style={{ padding: "6px 0" }}><span>{t.name} <span className="dim">· {t.qty} un.</span></span><strong>{brl(t.revenue)}</strong></div>
            ))}
          </div>
          <div className="card">
            <h2>De onde vêm as visitas</h2>
            {refs.length === 0 ? <p className="muted small">Acessos diretos ou ainda sem dados.</p> : refs.map((r) => (
              <div key={r.referrer} className="row between small" style={{ padding: "6px 0" }}><span>{r.referrer}</span><strong>{r.n}</strong></div>
            ))}
          </div>
          {lowStock.length > 0 && (
            <div className="card">
              <h2>Estoque baixo</h2>
              {lowStock.map((p) => (
                <div key={p.id} className="row between small" style={{ padding: "6px 0" }}><Link href={`/admin/produtos/${p.id}`} className="link">{p.name}</Link><span className={`badge ${p.stock <= 0 ? "bad" : "warn"}`}>{p.stock} un.</span></div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
