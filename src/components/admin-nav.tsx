"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export const ADMIN_LINKS: [string, string][] = [
  ["/admin", "Visão geral"],
  ["/admin/pedidos", "Pedidos"],
  ["/admin/produtos", "Produtos"],
  ["/admin/categorias", "Categorias"],
  ["/admin/cupons", "Cupons"],
  ["/admin/conteudo", "Conteúdo do site"],
  ["/admin/frete-pagamento", "Frete e pagamento"],
  ["/admin/conta", "Conta e acessos"],
];

function isOn(path: string, href: string) {
  return href === "/admin" ? path === "/admin" : path.startsWith(href);
}

export function AdminSideNav({ pending }: { pending: number }) {
  const path = usePathname();
  return (
    <>
      {ADMIN_LINKS.map(([href, label]) => (
        <Link key={href} href={href} className={`nav-i ${isOn(path, href) ? "on" : ""}`}>
          <span className="grow">{label}</span>
          {href === "/admin/pedidos" && pending > 0 && <span className="cart-count">{pending}</span>}
        </Link>
      ))}
    </>
  );
}

export function AdminMobileNav() {
  const path = usePathname();
  return (
    <nav className="adm-mobile">
      {ADMIN_LINKS.map(([href, label]) => (
        <Link key={href} href={href} className={isOn(path, href) ? "on" : ""}>{label}</Link>
      ))}
    </nav>
  );
}
