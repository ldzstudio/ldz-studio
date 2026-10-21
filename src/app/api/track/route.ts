import { NextResponse } from "next/server";
import { q } from "@/lib/db";

const TYPES = new Set(["view", "product_view", "add_to_cart", "checkout"]);
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|lighthouse|headless/i;

export async function POST(req: Request) {
  try {
    if (BOT.test(req.headers.get("user-agent") || "")) return new NextResponse(null, { status: 204 });
    const b = await req.json();
    if (!TYPES.has(b.type)) return new NextResponse(null, { status: 204 });
    let ref: string | null = null;
    try {
      const r = b.referrer ? new URL(String(b.referrer)) : null;
      const self = new URL(req.url).host;
      ref = r && r.host !== self ? r.host.replace(/^www\./, "") : null;
    } catch {}
    await q("insert into events(type, path, product_id, session_id, referrer) values ($1,$2,$3,$4,$5)", [
      b.type,
      String(b.path || "").slice(0, 200),
      Number.isInteger(b.product_id) ? b.product_id : null,
      String(b.session_id || "").slice(0, 40),
      ref,
    ]);
  } catch {}
  return new NextResponse(null, { status: 204 });
}
