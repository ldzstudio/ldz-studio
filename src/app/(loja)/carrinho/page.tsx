"use client";
import Link from "next/link";
import { useCart } from "@/components/cart";
import { IconTrash } from "@/components/icons";
import { ProductImage } from "@/components/product-card";
import { brl } from "@/lib/format";

export default function Carrinho() {
  const { items, ready, subtotal, setQty, remove } = useCart();
  return (
    <div className="container">
      <div className="page-head"><h1>Carrinho</h1></div>
      {!ready ? null : items.length === 0 ? (
        <div className="empty" style={{ marginBottom: 64 }}>
          <p style={{ marginBottom: 18 }}>Seu carrinho está vazio.</p>
          <Link href="/produtos" className="btn">Ver produtos</Link>
        </div>
      ) : (
        <div className="cart-layout">
          <div>
            {items.map((i) => (
              <div className="cart-line" key={i.key}>
                <Link href={`/produto/${i.slug}`} className="ph"><ProductImage src={i.image} alt={i.name} /></Link>
                <div className="stack" style={{ gap: 6 }}>
                  <Link href={`/produto/${i.slug}`} style={{ fontWeight: 600 }}>{i.name}</Link>
                  {Object.keys(i.options).length > 0 && (
                    <span className="small muted">{Object.entries(i.options).map(([k, v]) => `${k}: ${v}`).join(" · ")}</span>
                  )}
                  <div className="row">
                    <div className="qty sm">
                      <button onClick={() => setQty(i.key, i.qty - 1)} aria-label="Diminuir">−</button>
                      <span>{i.qty}</span>
                      <button onClick={() => setQty(i.key, i.qty + 1)} aria-label="Aumentar">+</button>
                    </div>
                    <button className="link small muted row" style={{ gap: 4 }} onClick={() => remove(i.key)}><IconTrash size={14} /> Remover</button>
                  </div>
                </div>
                <strong>{brl(i.unit_cents * i.qty)}</strong>
              </div>
            ))}
            <div style={{ paddingTop: 18 }}><Link href="/produtos" className="link small">← Continuar comprando</Link></div>
          </div>
          <div className="card summary">
            <div className="line"><span>Subtotal</span><span>{brl(subtotal)}</span></div>
            <div className="line"><span>Frete</span><span>calculado no checkout</span></div>
            <div className="total"><span>Total</span><span>{brl(subtotal)}</span></div>
            <Link href="/checkout" className="btn block">Finalizar compra</Link>
          </div>
        </div>
      )}
    </div>
  );
}
