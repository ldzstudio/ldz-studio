import type { Metadata } from "next";
import { AdminMobileNav, AdminSideNav } from "@/components/admin-nav";
import { requireAdmin } from "@/lib/auth";
import { one } from "@/lib/db";
import { logout } from "../actions";

export const metadata: Metadata = { title: "Painel", robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const p = await one<{ n: number }>("select count(*)::int as n from orders where status in ('pending','paid')");
  return (
    <div className="adm">
      <aside className="adm-side">
        <a href="/admin" className="brand"><img src="/mascote.png" alt="" /> <span>Painel</span></a>
        <AdminSideNav pending={p?.n ?? 0} />
        <div className="grow" />
        <a href="/" target="_blank" className="nav-i">Ver loja ↗</a>
        <div className="small dim" style={{ padding: "8px 12px" }}>{admin.email}</div>
        <form action={logout}><button className="btn ghost sm block">Sair</button></form>
      </aside>
      <div style={{ minWidth: 0 }}>
        <AdminMobileNav />
        <main className="adm-main">{children}</main>
      </div>
    </div>
  );
}
