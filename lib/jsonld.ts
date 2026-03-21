import { SITE_NAME } from "@/lib/constants/nav";
import { getEditorialBlocks, type FaqItem } from "@/lib/article-seo";
import type { Article } from "@/lib/types/article";
import { absoluteUrl } from "@/lib/seo";
import { cleanPlainText } from "@/lib/text/clean";

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

function getSameAsLinks() {
  const raw = process.env.NEXT_PUBLIC_SITE_SOCIALS?.trim();
  if (!raw) {
    return [];
  }

  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => item.startsWith("http"));
}

export function buildOrganizationJsonLd() {
  const sameAs = getSameAsLinks();

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: absoluteUrl("/"),
    logo: absoluteUrl("/logo.svg"),
    description:
      "Medio digital de noticias internacionales en espanol con contexto editorial y enfoque en impacto para America Latina.",
    email: "contacto@latamworldnews.com",
    sameAs,
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: "contacto@latamworldnews.com",
        availableLanguage: ["es"]
      },
      {
        "@type": "ContactPoint",
        contactType: "newsroom",
        email: "contacto@latamworldnews.com",
        availableLanguage: ["es"]
      }
    ]
  };
}

export function buildWebsiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    alternateName: "LWN",
    url: absoluteUrl("/"),
    inLanguage: "es",
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: absoluteUrl("/")
    },
    potentialAction: {
      "@type": "SearchAction",
      target: `${absoluteUrl("/buscar")}?q={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  };
}

export function buildBreadcrumbJsonLd(items: Array<{ name: string; pathname: string }>) {
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
      ? "Editorial Impacto Latinoamerica"
      : article.impact_format === "opinion"
        ? "Opinion"
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
        name: cleanPlainText(article.region)
      },
      {
        "@type": "Thing",
        name: cleanPlainText(article.category)
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

export function buildFaqJsonLd(items: FaqItem[]) {
  if (items.length === 0) {
    return null;
  }

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer
      }
    }))
  };
}

export function buildAboutPageJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "Acerca de LATAM World News",
    url: absoluteUrl("/acerca"),
    description:
      "Informacion institucional sobre LATAM World News, su enfoque editorial y su cobertura internacional para America Latina.",
    inLanguage: "es",
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: absoluteUrl("/")
    }
  };
}

export function buildContactPageJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: "Contacto LATAM World News",
    url: absoluteUrl("/contacto"),
    description:
      "Canales de contacto editorial y comercial de LATAM World News para correcciones, alianzas y consultas.",
    inLanguage: "es",
    mainEntity: {
      "@type": "Organization",
      name: SITE_NAME,
      email: "contacto@latamworldnews.com",
      url: absoluteUrl("/")
    }
  };
}
