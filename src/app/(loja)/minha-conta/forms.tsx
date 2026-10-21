"use client";
import { useActionState } from "react";
import type { Customer } from "@/lib/customer";
import { changeCustomerPassword, updateProfile } from "../conta-actions";

const UFS = "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ");

export function AccountForms({ me }: { me: Customer }) {
  const [p, saveProfile, savingP] = useActionState(updateProfile, null);
  const [pw, savePw, savingPw] = useActionState(changeCustomerPassword, null);
  const a = me.address;
  return (
    <div className="adm-grid" style={{ alignItems: "start" }}>
      <form action={saveProfile} className="card form-sec">
        <h2 style={{ margin: 0 }}>Meus dados e endereço</h2>
        <span className="small dim">Usados para preencher o checkout automaticamente.</span>
        <div className="grid-2">
          <label className="field">Nome completo<input type="text" name="name" defaultValue={me.name} required /></label>
          <label className="field">E-mail<input type="email" value={me.email} disabled /></label>
          <label className="field">WhatsApp<input type="tel" name="phone" defaultValue={me.phone} /></label>
          <label className="field">CPF<input type="text" name="cpf" defaultValue={me.cpf} /></label>
        </div>
        <div className="grid-3">
          <label className="field">CEP<input type="text" name="cep" defaultValue={a?.cep} /></label>
          <label className="field">Número<input type="text" name="number" defaultValue={a?.number} /></label>
          <label className="field">Complemento<input type="text" name="complement" defaultValue={a?.complement} /></label>
        </div>
        <label className="field">Rua<input type="text" name="street" defaultValue={a?.street} /></label>
        <div className="grid-3">
          <label className="field">Bairro<input type="text" name="district" defaultValue={a?.district} /></label>
          <label className="field">Cidade<input type="text" name="city" defaultValue={a?.city} /></label>
          <label className="field">Estado
            <select name="state" defaultValue={a?.state ?? ""}>
              <option value="">UF</option>
              {UFS.map((u) => <option key={u}>{u}</option>)}
            </select>
          </label>
        </div>
        <div className="row wrap">
          <button className="btn sm" disabled={savingP}>{savingP ? "Salvando…" : "Salvar dados"}</button>
          {p?.error && <span className="small" style={{ color: "var(--bad)" }}>{p.error}</span>}
          {p?.message && <span className="small" style={{ color: "var(--ok)" }}>{p.message}</span>}
        </div>
      </form>
      <form action={savePw} className="card form-sec">
        <h2 style={{ margin: 0 }}>Trocar senha</h2>
        <label className="field">Senha atual<input type="password" name="current" required autoComplete="current-password" /></label>
        <label className="field">Nova senha (mín. 8)<input type="password" name="next_password" required minLength={8} autoComplete="new-password" /></label>
        <div className="row wrap">
          <button className="btn sm" disabled={savingPw}>{savingPw ? "Salvando…" : "Alterar senha"}</button>
          {pw?.error && <span className="small" style={{ color: "var(--bad)" }}>{pw.error}</span>}
          {pw?.message && <span className="small" style={{ color: "var(--ok)" }}>{pw.message}</span>}
        </div>
      </form>
    </div>
  );
}
