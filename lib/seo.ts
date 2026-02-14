import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/constants/nav";

const baseSiteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export function absoluteUrl(pathname = "/"): string {
  return new URL(pathname, baseSiteUrl).toString();
}

export function buildMetadata(input: {
  title: string;
  description: string;
  pathname: string;
  imageUrl?: string;
}): Metadata {
  const fullTitle = `${input.title} | ${SITE_NAME}`;
  const canonical = absoluteUrl(input.pathname);
  const ogImage = input.imageUrl ?? absoluteUrl("/og-default.jpg");

  return {
    title: fullTitle,
    description: input.description,
    alternates: { canonical },
    openGraph: {
      title: fullTitle,
      description: input.description,
      url: canonical,
      type: "website",
      siteName: SITE_NAME,
      locale: "es_LA",
      images: [{ url: ogImage }]
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: input.description,
      images: [ogImage]
    }
  };
}
