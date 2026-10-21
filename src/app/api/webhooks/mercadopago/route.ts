import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { syncMercadoPagoPayment } from "@/lib/orders";

// Valida a assinatura x-signature quando MP_WEBHOOK_SECRET está configurado.
function validSignature(req: Request, dataId: string) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return true;
  const sig = req.headers.get("x-signature") || "";
  const requestId = req.headers.get("x-request-id") || "";
  const parts = Object.fromEntries(sig.split(",").map((p) => p.trim().split("=") as [string, string]));
  if (!parts.ts || !parts.v1) return false;
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${parts.ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1));
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const body = await req.json().catch(() => ({}));
  const type = body.type || url.searchParams.get("type") || url.searchParams.get("topic");
  const id = String(body.data?.id || url.searchParams.get("data.id") || url.searchParams.get("id") || "");
  if (type === "payment" && id) {
    if (!validSignature(req, id)) return NextResponse.json({ ok: false }, { status: 401 });
    // O status é sempre consultado direto na API do Mercado Pago (nunca confiamos no corpo).
    await syncMercadoPagoPayment(id);
  }
  return NextResponse.json({ ok: true });
}
