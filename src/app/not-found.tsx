import Link from "next/link";

export default function NotFound() {
  return (
    <div className="login-wrap">
      <div className="stack center" style={{ justifyItems: "center" }}>
        <img src="/mascote.png" alt="" style={{ width: 90, opacity: 0.6 }} />
        <h1 style={{ fontSize: 40 }}>Página não encontrada</h1>
        <p className="muted">O link pode estar errado ou o produto saiu da loja.</p>
        <Link href="/" className="btn">Voltar para a loja</Link>
      </div>
    </div>
  );
}
