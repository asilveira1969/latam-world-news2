import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/constants/nav";

function normalizeSiteUrl(rawUrl: string): string {
  const withProtocol = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
  return withProtocol.replace(/\/+$/g, "");
}

export function getSiteUrl(): string {
  const explicitUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicitUrl) {
    return normalizeSiteUrl(explicitUrl);
  }

  const vercelProductionUrl =
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() || process.env.VERCEL_URL?.trim();
  if (vercelProductionUrl) {
    return normalizeSiteUrl(vercelProductionUrl);
  }

  return process.env.NODE_ENV === "production"
    ? "https://latamworldnews.com"
    : "http://localhost:3000";
}

const baseSiteUrl = getSiteUrl();

export function absoluteUrl(pathname = "/"): string {
  return new URL(pathname, baseSiteUrl).toString();
}

type MetadataInput = {
  title: string;
  description: string;
  pathname: string;
  imageUrl?: string;
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
  noindex?: boolean;
  keywords?: string[];
};

export function buildMetadata(input: MetadataInput): Metadata {
  const fullTitle = input.title.includes(SITE_NAME) ? input.title : `${input.title} | ${SITE_NAME}`;
  const canonical = absoluteUrl(input.pathname);
  const ogImage = input.imageUrl ?? absoluteUrl("/og-default.svg");
  const robots = input.noindex
    ? { index: false, follow: true, googleBot: { index: false, follow: true } }
    : {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          "max-image-preview": "large" as const,
          "max-snippet": -1,
          "max-video-preview": -1
        }
      };

  return {
    metadataBase: new URL(baseSiteUrl),
    applicationName: SITE_NAME,
    title: fullTitle,
    description: input.description,
    category: "news",
    keywords: input.keywords,
    alternates: { canonical },
    robots,
    openGraph: {
      title: fullTitle,
      description: input.description,
      url: canonical,
      type: input.type ?? "website",
      siteName: SITE_NAME,
      locale: "es_LA",
      images: [{ url: ogImage, width: 1200, height: 630, alt: fullTitle }],
      publishedTime: input.publishedTime,
      modifiedTime: input.modifiedTime
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: input.description,
      images: [ogImage]
    }
  };
}
