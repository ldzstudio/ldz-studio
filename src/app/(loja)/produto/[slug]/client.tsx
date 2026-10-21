"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart";
import { IconClock, IconShield, IconTruck } from "@/components/icons";
import { ProductImage } from "@/components/product-card";
import type { ProductOption } from "@/lib/catalog";
import { brl } from "@/lib/format";

export function Gallery({ images, name }: { images: string[]; name: string }) {
  const [i, setI] = useState(0);
  return (
    <div className="gallery">
      <div className="main"><ProductImage src={images[i]} alt={name} /></div>
      {images.length > 1 && (
        <div className="thumbs">
          {images.map((src, idx) => (
            <button key={src + idx} className={idx === i ? "on" : ""} onClick={() => setI(idx)} aria-label={`Foto ${idx + 1}`}>
              <ProductImage src={src} alt="" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

type P = { id: number; slug: string; name: string; image: string | null; price_cents: number; compare_at_cents: number | null; stock: number | null; options: ProductOption[] };

export function BuyBox({ product, shortDescription, productionDays, freeAbove, pixDiscount }: { product: P; shortDescription: string; productionDays: number; freeAbove: number; pixDiscount: number }) {
  const { add } = useCart();
  const router = useRouter();
  const [sel, setSel] = useState<Record<string, string>>(() =>
    Object.fromEntries(product.options.filter((o) => o.values.length).map((o) => [o.name, o.values[0].label])),
  );
  const [qty, setQty] = useState(1);
  const unit =
    product.price_cents +
    product.options.reduce((a, o) => a + (o.values.find((v) => v.label === sel[o.name])?.price_delta_cents ?? 0), 0);
  const soldOut = product.stock != null && product.stock <= 0;
  const maxQty = product.stock != null ? Math.max(1, product.stock) : 99;
  const off = product.compare_at_cents && product.compare_at_cents > product.price_cents ? product.compare_at_cents + (unit - product.price_cents) : 0;

  const doAdd = (go: boolean) => {
    add({ productId: product.id, slug: product.slug, name: product.name, image: product.image, unit_cents: unit, options: sel, qty });
    if (go) router.push("/carrinho");
  };

  return (
    <div className="buybox">
      <div className="stack" style={{ gap: 12 }}>
        <h1>{product.name}</h1>
        {shortDescription && <p className="muted">{shortDescription}</p>}
      </div>
      <div className="stack" style={{ gap: 4 }}>
        <div className="price">
          <strong>{brl(unit)}</strong>
          {off > 0 && <s>{brl(off)}</s>}
        </div>
        {pixDiscount > 0 && <span className="small muted">ou {brl(Math.round(unit * (1 - pixDiscount / 100)))} no Pix ({pixDiscount}% off)</span>}
      </div>
      {product.options.map((o) => (
        <div className="opt-group" key={o.name}>
          <span className="label">{o.name}: <strong style={{ color: "var(--text)" }}>{sel[o.name]}</strong></span>
          <div className="opts">
            {o.values.map((v) => (
              <button key={v.label} className={`opt ${sel[o.name] === v.label ? "on" : ""}`} onClick={() => setSel({ ...sel, [o.name]: v.label })}>
                {v.label}
                {v.price_delta_cents ? ` (+${brl(v.price_delta_cents)})` : ""}
              </button>
            ))}
          </div>
        </div>
      ))}
      {soldOut ? (
        <button className="btn block" disabled>Esgotado</button>
      ) : (
        <div className="stack" style={{ gap: 10 }}>
          <div className="row">
            <div className="qty">
              <button onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Diminuir">−</button>
              <span>{qty}</span>
              <button onClick={() => setQty(Math.min(maxQty, qty + 1))} aria-label="Aumentar">+</button>
            </div>
            <button className="btn grow" onClick={() => doAdd(false)}>Adicionar ao carrinho</button>
          </div>
          <button className="btn ghost block" onClick={() => doAdd(true)}>Comprar agora</button>
          {product.stock != null && product.stock <= 5 && <span className="small" style={{ color: "var(--warn)" }}>Últimas {product.stock} unidades!</span>}
        </div>
      )}
      <div className="perks">
        <div><IconClock /> Produção em até {productionDays} dias úteis</div>
        <div><IconTruck /> Envio para todo o Brasil{freeAbove > 0 ? ` · frete grátis acima de ${brl(freeAbove)}` : ""}</div>
        <div><IconShield /> Pagamento seguro via Pix ou cartão</div>
      </div>
    </div>
  );
}
