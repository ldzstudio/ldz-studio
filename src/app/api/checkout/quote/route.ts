import { NextResponse } from "next/server";
import { quote } from "@/lib/orders";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const items = Array.isArray(body.items) ? body.items : [];
  const q = await quote(items, { coupon: String(body.coupon || ""), shippingId: String(body.shippingId || ""), payment: String(body.payment || "") });
  return NextResponse.json({ ...q, coupon: q.coupon ? { code: q.coupon.code } : null });
}
