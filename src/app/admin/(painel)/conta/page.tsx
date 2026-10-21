import { ActionForm } from "@/components/action-form";
import { requireAdmin } from "@/lib/auth";
import { q } from "@/lib/db";
import { addAdmin, changePassword, removeAdmin } from "../../actions";

export default async function AdminAccount() {
  const me = await requireAdmin();
  const admins = await q<{ id: number; email: string }>("select id, email from admin_users order by id");
  return (
    <>
      <div className="adm-top"><h1>Conta e acessos</h1></div>
      <div className="adm-grid" style={{ alignItems: "start" }}>
        <div className="card">
          <h2>Trocar minha senha</h2>
          <ActionForm action={changePassword} submit="Alterar senha" resetOnSuccess>
            <label className="field">Senha atual<input type="password" name="current" required autoComplete="current-password" /></label>
            <label className="field">Nova senha (mín. 8 caracteres)<input type="password" name="next" required minLength={8} autoComplete="new-password" /></label>
          </ActionForm>
        </div>
        <div className="card">
          <h2>Pessoas com acesso ao painel</h2>
          {admins.map((a) => (
            <div key={a.id} className="row between small" style={{ padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
              <span>{a.email}{a.id === me.id ? " (você)" : ""}</span>
              {a.id !== me.id && <form action={removeAdmin.bind(null, a.id)}><button className="link small" style={{ color: "var(--bad)" }}>Remover</button></form>}
            </div>
          ))}
          <div style={{ marginTop: 16 }}>
            <ActionForm action={addAdmin} submit="Dar acesso" resetOnSuccess>
              <label className="field">E-mail<input type="email" name="email" required /></label>
              <label className="field">Senha inicial<input type="password" name="password" required minLength={8} autoComplete="new-password" /></label>
            </ActionForm>
          </div>
        </div>
      </div>
    </>
  );
}
