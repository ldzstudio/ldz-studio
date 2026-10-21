"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type CartItem = {
  key: string;
  productId: number;
  slug: string;
  name: string;
  image: string | null;
  unit_cents: number;
  options: Record<string, string>;
  qty: number;
};

type Ctx = {
  items: CartItem[];
  ready: boolean;
  count: number;
  subtotal: number;
  add: (item: Omit<CartItem, "key">) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  toast: string | null;
};

const CartCtx = createContext<Ctx | null>(null);
const STORAGE = "ldz_cart_v1";

export function sessionId() {
  try {
    let id = localStorage.getItem("ldz_sid");
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem("ldz_sid", id);
    }
    return id;
  } catch {
    return "anon";
  }
}

export function track(type: string, extra: { product_id?: number } = {}) {
  try {
    const body = JSON.stringify({ type, path: location.pathname, referrer: document.referrer || null, session_id: sessionId(), ...extra });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
    else fetch("/api/track", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true });
  } catch {}
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE, JSON.stringify(items));
    } catch {}
  }, [items, ready]);

  const add = useCallback((item: Omit<CartItem, "key">) => {
    const key = `${item.productId}:${JSON.stringify(item.options)}`;
    setItems((prev) => {
      const found = prev.find((i) => i.key === key);
      if (found) return prev.map((i) => (i.key === key ? { ...i, qty: Math.min(99, i.qty + item.qty) } : i));
      return [...prev, { ...item, key }];
    });
    setToast(`${item.name} adicionado ao carrinho`);
    setTimeout(() => setToast(null), 2800);
    track("add_to_cart", { product_id: item.productId });
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      items,
      ready,
      toast,
      count: items.reduce((a, i) => a + i.qty, 0),
      subtotal: items.reduce((a, i) => a + i.qty * i.unit_cents, 0),
      add,
      setQty: (key, qty) => setItems((prev) => prev.map((i) => (i.key === key ? { ...i, qty: Math.max(1, Math.min(99, qty)) } : i))),
      remove: (key) => setItems((prev) => prev.filter((i) => i.key !== key)),
      clear: () => setItems([]),
    }),
    [items, ready, toast, add],
  );

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export function useCart() {
  const c = useContext(CartCtx);
  if (!c) throw new Error("useCart fora do CartProvider");
  return c;
}
