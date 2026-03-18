import { SITE_NAME } from "@/lib/constants/nav";
import { getEditorialBlocks } from "@/lib/article-seo";
import type { Article } from "@/lib/types/article";
import { absoluteUrl } from "@/lib/seo";

function articlePath(article: Article) {
  if (article.impact_format === "editorial") {
    return `/impacto/editorial/${article.slug}`;
  }
  if (article.impact_format === "opinion") {
    return `/impacto/opinion/${article.slug}`;
  }
  if (article.impact_format === "columnist") {
    return `/impacto/columnistas/${article.slug}`;
  }
  return article.is_impact ? `/impacto/${article.slug}` : `/nota/${article.slug}`;
}

export function buildOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: absoluteUrl("/"),
    logo: absoluteUrl("/logo.svg"),
    sameAs: []
  };
}

export function buildWebsiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: absoluteUrl("/"),
    inLanguage: "es",
    potentialAction: {
      "@type": "SearchAction",
      target: `${absoluteUrl("/buscar")}?q={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  };
}

export function buildBreadcrumbJsonLd(
  items: Array<{ name: string; pathname: string }>
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.pathname)
    }))
  };
}

export function buildCollectionPageJsonLd(input: {
  title: string;
  description: string;
  pathname: string;
  items: Article[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: input.title,
    description: input.description,
    url: absoluteUrl(input.pathname),
    inLanguage: "es",
    isPartOf: absoluteUrl("/"),
    hasPart: input.items.slice(0, 10).map((article) => ({
      "@type": "NewsArticle",
      headline: article.title,
      url: absoluteUrl(articlePath(article)),
      datePublished: article.published_at
    }))
  };
}

export function buildNewsArticleJsonLd(
  article: Article,
  pathname: string,
  relatedArticles: Article[] = []
) {
  const editorial = getEditorialBlocks(article);
  const articleSection =
    article.impact_format === "editorial"
      ? "Editorial Impacto Latinoamérica"
      : article.impact_format === "opinion"
        ? "Opinión"
        : article.impact_format === "columnist"
          ? "Columnistas"
      : article.is_impact
        ? "Impacto en LATAM"
        : article.category;
  const imageUrl = article.image_url.startsWith("http")
    ? article.image_url
    : absoluteUrl(article.image_url || "/og-default.svg");

  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: editorial.seoDescription,
    image: [imageUrl],
    datePublished: article.published_at,
    dateModified: article.created_at,
    articleSection,
    keywords: article.tags,
    inLanguage: "es",
    isAccessibleForFree: true,
    about: [
      {
        "@type": "Thing",
        name: article.region
      },
      {
        "@type": "Thing",
        name: article.category
      }
    ],
    author: {
      "@type": "Organization",
      name: SITE_NAME
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl("/logo.svg")
      }
    },
    isBasedOn: article.source_url,
    mainEntityOfPage: absoluteUrl(pathname),
    mentions: relatedArticles.slice(0, 4).map((item) => ({
      "@type": "Article",
      headline: item.title,
      url: absoluteUrl(articlePath(item))
    }))
  };
}
