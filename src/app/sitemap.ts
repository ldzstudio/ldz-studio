import type { MetadataRoute } from "next";
import { listProducts } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  const products = await listProducts().catch(() => []);
  return [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/produtos`, changeFrequency: "daily", priority: 0.9 },
    ...products.map((p) => ({ url: `${base}/produto/${p.slug}`, changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}
