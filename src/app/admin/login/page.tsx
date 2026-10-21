"use client";
import { useActionState } from "react";
import { login } from "../actions";

export default function Login() {
  const [state, action, pending] = useActionState(login, null);
  return (
    <div className="login-wrap">
      <form action={action} className="card login-card">
        <img src="/mascote.png" alt="" />
        <div className="center">
          <h1 style={{ fontSize: 24 }}>Painel da loja</h1>
          <p className="muted small" style={{ marginTop: 6 }}>Entre para gerenciar sua loja</p>
        </div>
        <label className="field">E-mail<input type="email" name="email" required autoComplete="username" /></label>
        <label className="field">Senha<input type="password" name="password" required autoComplete="current-password" /></label>
        {state?.error && <div className="alert bad">{state.error}</div>}
        <button className="btn block" disabled={pending}>{pending ? "Entrando…" : "Entrar"}</button>
        <a href="/" className="small muted center">← Voltar para a loja</a>
      </form>
    </div>
  );
}
