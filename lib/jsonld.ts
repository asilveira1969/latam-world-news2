import { SITE_NAME } from "@/lib/constants/nav";
import type { Article } from "@/lib/types/article";
import { absoluteUrl } from "@/lib/seo";

export function buildOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: absoluteUrl("/"),
    logo: absoluteUrl("/logo.png"),
    sameAs: []
  };
}

export function buildNewsArticleJsonLd(article: Article, pathname: string) {
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.excerpt,
    image: [article.image_url],
    datePublished: article.published_at,
    dateModified: article.created_at,
    author: {
      "@type": "Organization",
      name: SITE_NAME
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl("/logo.png")
      }
    },
    isBasedOn: article.source_url,
    mainEntityOfPage: absoluteUrl(pathname)
  };
}
