"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { track, useCart } from "./cart";
import { IconCart, IconMenu, IconUser } from "./icons";

export function Header({ name, customer }: { name: string; customer: string | null }) {
  const { count, ready } = useCart();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  const links = [
    ["/", "Início"],
    ["/produtos", "Produtos"],
    ["/#como-funciona", "Como funciona"],
    ["/#sobre", "Sobre"],
    ["/#duvidas", "Dúvidas"],
  ];
  return (
    <header className="header">
      <div className="container">
        <Link href="/" className="brand" aria-label={name}>
          <img src="/mascote.png" alt="" />
          <span>{name}</span>
        </Link>
        <nav className={`nav ${open ? "open" : ""}`}>
          {links.map(([href, label]) => (
            <Link key={href} href={href} className={path === href ? "active" : ""}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="row" style={{ marginLeft: "auto" }}>
          <Link href={customer ? "/minha-conta" : "/entrar"} className="cart-btn" aria-label={customer ? "Minha conta" : "Entrar"}>
            <IconUser />
            <span className="hide-sm">{customer ? customer : "Entrar"}</span>
          </Link>
          <Link href="/carrinho" className="cart-btn" aria-label="Carrinho">
            <IconCart />
            <span className="hide-sm">Carrinho</span>
            {ready && count > 0 && <span className="cart-count">{count}</span>}
          </Link>
          <button className="menu-toggle" onClick={() => setOpen((o) => !o)} aria-label="Menu">
            <IconMenu />
          </button>
        </div>
      </div>
    </header>
  );
}

export function CartToast() {
  const { toast } = useCart();
  if (!toast) return null;
  return (
    <div className="toast" role="status">
      ✓ {toast} <Link href="/carrinho">Ver carrinho</Link>
    </div>
  );
}

export function PageTracker() {
  const path = usePathname();
  useEffect(() => {
    if (!path.startsWith("/produto/")) track("view");
  }, [path]);
  return null;
}

export function ProductViewTracker({ productId }: { productId: number }) {
  useEffect(() => track("product_view", { product_id: productId }), [productId]);
  return null;
}
