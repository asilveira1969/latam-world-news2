import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/constants/nav";
import { cleanExcerpt, cleanPlainText } from "@/lib/text/clean";

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

function normalizeTitle(title: string): string {
  return cleanExcerpt(cleanPlainText(title), 68);
}

function normalizeDescription(description: string): string {
  return cleanExcerpt(cleanPlainText(description), 165);
}

export function buildMetadata(input: MetadataInput): Metadata {
  const normalizedTitle = normalizeTitle(input.title);
  const fullTitle = normalizedTitle.includes(SITE_NAME)
    ? normalizedTitle
    : normalizeTitle(`${normalizedTitle} | ${SITE_NAME}`);
  const description = normalizeDescription(input.description);
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
    description,
    category: "news",
    keywords: input.keywords,
    alternates: { canonical },
    robots,
    openGraph: {
      title: fullTitle,
      description,
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
      description,
      images: [ogImage]
    }
  };
}
