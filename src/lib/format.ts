export function brl(cents: number | null | undefined) {
  return ((cents ?? 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** "59,90" | "59.90" | "R$ 1.059,90" -> 5990 */
export function parseMoney(input: FormDataEntryValue | string | null | undefined): number {
  let s = String(input ?? "").replace(/[^\d,.-]/g, "").trim();
  if (!s) return 0;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export function centsToInput(cents: number | null | undefined) {
  if (cents == null) return "";
  return (cents / 100).toFixed(2).replace(".", ",");
}

export function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function dateTime(d: string | Date) {
  return new Date(d).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });
}

export function imgSrc(ref: string) {
  return /^https?:\/\//.test(ref) || ref.startsWith("/") ? ref : `/img/${ref}`;
}

export const ORDER_STATUS: Record<string, { label: string; tone: string }> = {
  pending: { label: "Aguardando pagamento", tone: "warn" },
  paid: { label: "Pago", tone: "ok" },
  production: { label: "Em produção", tone: "info" },
  shipped: { label: "Enviado", tone: "info" },
  delivered: { label: "Entregue", tone: "ok" },
  canceled: { label: "Cancelado", tone: "bad" },
};

export const PAYMENT_LABEL: Record<string, string> = {
  mercadopago: "Mercado Pago (Pix/cartão/boleto)",
  pix: "Pix",
  whatsapp: "Combinar pelo WhatsApp",
};
