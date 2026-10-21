import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForms } from "./forms";
import { getCustomer } from "@/lib/customer";

export const metadata: Metadata = { title: "Entrar ou criar conta", robots: { index: false } };

export default async function Entrar({ searchParams }: { searchParams: Promise<{ next?: string; criar?: string }> }) {
  const sp = await searchParams;
  const next = sp.next?.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/minha-conta";
  if (await getCustomer()) redirect(next);
  return (
    <div className="container" style={{ maxWidth: 960, paddingBottom: 64 }}>
      <div className="page-head">
        <span className="eyebrow">Sua conta</span>
        <h1>Entrar ou criar conta</h1>
        <p className="muted" style={{ marginTop: 10 }}>Acompanhe seus pedidos e compre mais rápido, com seus dados já preenchidos.</p>
      </div>
      <AuthForms next={next} />
    </div>
  );
}
