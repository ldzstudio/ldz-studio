"use client";
import { useActionState } from "react";
import type { ActionState } from "@/app/admin/actions";

export function ActionForm({
  action,
  children,
  submit = "Salvar",
  className = "stack",
  resetOnSuccess = false,
}: {
  action: (s: ActionState, f: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  submit?: string;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, run, pending] = useActionState(async (s: ActionState, f: FormData) => {
    const r = await action(s, f);
    return r;
  }, null);
  return (
    <form action={run} className={className} key={resetOnSuccess && state?.ok ? Math.random() : undefined}>
      {children}
      <div className="row wrap">
        <button className="btn sm" disabled={pending}>{pending ? "Salvando…" : submit}</button>
        {state?.error && <span className="small" style={{ color: "var(--bad)" }}>{state.error}</span>}
        {state?.message && <span className="small" style={{ color: "var(--ok)" }}>{state.message}</span>}
      </div>
    </form>
  );
}
