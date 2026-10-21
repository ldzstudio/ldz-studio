"use client";
import { useActionState } from "react";
import { loginCustomer, registerCustomer } from "../conta-actions";

export function AuthForms({ next }: { next: string }) {
  const [loginState, login, logging] = useActionState(loginCustomer, null);
  const [regState, register, registering] = useActionState(registerCustomer, null);
  return (
    <div className="grid-2" style={{ alignItems: "start", gap: 20 }}>
      <form action={login} className="card form-sec">
        <h2 style={{ fontSize: 22, margin: 0 }}>Já tenho conta</h2>
        <input type="hidden" name="next" value={next} />
        <label className="field">E-mail<input type="email" name="email" required autoComplete="email" defaultValue={loginState?.values?.email} /></label>
        <label className="field">Senha<input type="password" name="password" required autoComplete="current-password" /></label>
        {loginState?.error && <div className="alert bad">{loginState.error}</div>}
        <button className="btn block" disabled={logging}>{logging ? "Entrando…" : "Entrar"}</button>
        <span className="small dim">Esqueceu a senha? Fale com a gente pelo WhatsApp que redefinimos para você.</span>
      </form>
      <form action={register} className="card form-sec">
        <h2 style={{ fontSize: 22, margin: 0 }}>Criar conta</h2>
        <input type="hidden" name="next" value={next} />
        <label className="field">Nome completo<input type="text" name="name" required autoComplete="name" defaultValue={regState?.values?.name} /></label>
        <label className="field">E-mail<input type="email" name="email" required autoComplete="email" defaultValue={regState?.values?.email} /></label>
        <label className="field">WhatsApp<input type="tel" name="phone" autoComplete="tel" placeholder="(11) 99999-9999" defaultValue={regState?.values?.phone} /></label>
        <div className="grid-2">
          <label className="field">Senha (mín. 8)<input type="password" name="password" required minLength={8} autoComplete="new-password" /></label>
          <label className="field">Repita a senha<input type="password" name="confirm" required minLength={8} autoComplete="new-password" /></label>
        </div>
        {regState?.error && <div className="alert bad">{regState.error}</div>}
        <button className="btn block" disabled={registering}>{registering ? "Criando…" : "Criar minha conta"}</button>
      </form>
    </div>
  );
}
