import { notFound } from "next/navigation";
import { getSettings } from "@/lib/settings";

export default async function InfoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = await getSettings();
  const page = s.pages.find((p) => p.slug === slug);
  if (!page) notFound();
  return (
    <div className="container" style={{ maxWidth: 820, paddingBottom: 64 }}>
      <div className="page-head"><h1>{page.title}</h1></div>
      <p className="desc" style={{ fontSize: 16 }}>{page.content}</p>
    </div>
  );
}
