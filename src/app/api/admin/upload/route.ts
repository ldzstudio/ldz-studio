import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";
import { one } from "@/lib/db";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);

export async function POST(req: Request) {
  if (!(await getAdmin())) return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  const form = await req.formData();
  const ids: string[] = [];
  for (const f of form.getAll("files")) {
    if (!(f instanceof File)) continue;
    if (!ALLOWED.has(f.type)) return NextResponse.json({ error: `Formato não suportado: ${f.name}` }, { status: 400 });
    if (f.size > 6 * 1024 * 1024) return NextResponse.json({ error: `${f.name} passa de 6 MB` }, { status: 400 });
    const row = await one<{ id: string }>("insert into images(mime, data) values ($1,$2) returning id", [f.type, Buffer.from(await f.arrayBuffer())]);
    ids.push(row!.id);
  }
  return NextResponse.json({ ids });
}
