import type { Metadata } from "next";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TopbarTicker from "@/components/TopbarTicker";
import StructuredData from "@/components/StructuredData";
import { getLatest } from "@/lib/data/articles-repo";
import { buildMetadata } from "@/lib/seo";
import { buildOrganizationJsonLd, buildWebsiteJsonLd } from "@/lib/jsonld";
import { ADSENSE_CLIENT_ID, ADSENSE_ENABLED } from "@/lib/config/ads";

export const metadata: Metadata = {
  ...buildMetadata({
    title: "Noticias internacionales para LATAM",
    description:
      "Portal de noticias internacionales en espa\u00f1ol con contexto regional, an\u00e1lisis propio y cobertura curada para Am\u00e9rica Latina.",
    pathname: "/",
    keywords: [
      "noticias internacionales",
      "Am\u00e9rica Latina",
      "geopol\u00edtica",
      "econom\u00eda global",
      "energ\u00eda",
      "tecnolog\u00eda"
    ]
  }),
  authors: [{ name: "LATAM World News" }],
  creator: "LATAM World News",
  publisher: "LATAM World News",
  icons: {
    icon: "/icon.svg",
    apple: "/apple-icon.svg"
  },
  manifest: "/manifest.webmanifest"
};

export default async function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const latest = await getLatest({ limit: 10 });
  const headlines = latest.map((article) => article.title);
  const orgJsonLd = buildOrganizationJsonLd();
  const websiteJsonLd = buildWebsiteJsonLd();

  return (
    <html lang="es">
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-0Q2589WZWE"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-0Q2589WZWE');
          `}
        </Script>
        {ADSENSE_ENABLED && ADSENSE_CLIENT_ID ? (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
            crossOrigin="anonymous"
          />
        ) : null}
      </head>
      <body>
        <StructuredData data={orgJsonLd} />
        <StructuredData data={websiteJsonLd} />
        <TopbarTicker headlines={headlines} />
        <Header />
        {children}
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
