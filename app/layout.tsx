import type { Metadata } from "next";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TopbarTicker from "@/components/TopbarTicker";
import { getLatest } from "@/lib/data/articles-repo";
import { buildMetadata } from "@/lib/seo";
import { buildOrganizationJsonLd } from "@/lib/jsonld";
import { ADSENSE_CLIENT_ID, ADSENSE_ENABLED } from "@/lib/config/ads";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "Noticias internacionales para LATAM",
  description:
    "Portal de noticias internacionales en espanol con enfoque explicativo para America Latina.",
  pathname: "/"
});

export default async function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const latest = await getLatest({ limit: 10 });
  const headlines = latest.map((article) => article.title);
  const orgJsonLd = buildOrganizationJsonLd();

  return (
    <html lang="es">
      <body>
        {ADSENSE_ENABLED && ADSENSE_CLIENT_ID ? (
          <Script
            id="adsense-script"
            async
            strategy="afterInteractive"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
            crossOrigin="anonymous"
          />
        ) : null}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        <TopbarTicker headlines={headlines} />
        <Header />
        {children}
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
