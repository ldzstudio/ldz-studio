import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  const base = process.env.SITE_URL || "http://localhost:3000";
  return {
    metadataBase: new URL(base),
    title: { default: `${s.store_name} · ${s.tagline}`, template: `%s · ${s.store_name}` },
    description: s.seo_description,
    icons: { icon: "/favicon.ico", apple: "/apple-touch-icon.png" },
    openGraph: { siteName: s.store_name, images: ["/logo-quadrado.png"], locale: "pt_BR", type: "website" },
  };
}

export const viewport: Viewport = { themeColor: "#070707" };

function inkFor(hex: string) {
  const m = hex.replace("#", "").match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return "#000000";
  const [r, g, b] = m.slice(1).map((x) => parseInt(x, 16));
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? "#000000" : "#ffffff";
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  const accent = /^#[0-9a-f]{6}$/i.test(s.accent) ? s.accent : "#ffffff";
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap"
        />
        <style>{`:root{--accent:${accent};--accent-ink:${inkFor(accent)}}`}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
