import { getArticleDisplayMeta } from "@/lib/editorial/article-display";
import { getPrimaryTopicSlug, isGenericTopicSlug, normalizeCountry, normalizeTopicSlug } from "@/lib/hubs";
import type { NormalizedArticle, TaxonomyQualitySummary } from "@/lib/types";
import type { Article } from "@/lib/types/article";

type TaxonomySeed = {
  title: string;
  excerpt: string;
  content?: string | null;
  source_name?: string | null;
  region: Article["region"];
  category?: string | null;
  tags?: string[];
  country?: string | null;
  countries?: string[] | null;
  is_impact?: boolean;
  impact_format?: Article["impact_format"] | null;
};

function buildTemporaryArticle(seed: TaxonomySeed): Article {
  return {
    id: "taxonomy-seed",
    title: seed.title,
    slug: "taxonomy-seed",
    excerpt: seed.excerpt,
    content: seed.content ?? null,
    topic_slug: null,
    section_slug: null,
    latamworldnews_summary: null,
    curated_news: null,
    editorial_status: null,
    editorial_generated_at: null,
    editorial_model: null,
    seo_title: null,
    seo_description: null,
    editorial_context: null,
    latam_angle: null,
    faq_items: null,
    image_url: "",
    source_name: seed.source_name ?? "Fuente externa",
    source_url: "https://example.com/taxonomy-seed",
    region: seed.region,
    country: seed.country ?? null,
    category: seed.category ?? "Internacional",
    tags: seed.tags ?? [],
    countries: seed.countries ?? null,
    impact_format: seed.impact_format ?? null,
    editorial_sections: null,
    published_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    is_featured: false,
    is_impact: seed.is_impact ?? false,
    views: 0
  };
}

export function deriveSectionSlug(
  input: Pick<Article, "is_impact" | "impact_format" | "region">
): string {
  if (input.impact_format === "editorial") {
    return "impacto-editorial";
  }
  if (input.impact_format === "opinion") {
    return "impacto-opinion";
  }
  if (input.impact_format === "columnist") {
    return "impacto-columnistas";
  }
  if (input.is_impact) {
    return "impacto";
  }
  if (input.region === "LatAm" || input.region === "UY" || input.region === "AR" || input.region === "BR" || input.region === "MX" || input.region === "CL") {
    return "latinoamerica";
  }
  if (input.region === "EE.UU.") {
    return "eeuu";
  }
  if (input.region === "Europa") {
    return "europa";
  }
  if (input.region === "Asia") {
    return "asia";
  }
  if (input.region === "Medio Oriente") {
    return "medio-oriente";
  }

  return "mundo";
}

export function deriveIngestionTaxonomy(seed: TaxonomySeed): {
  country: string | null;
  topic_slug: string | null;
  section_slug: string;
  tags: string[];
} {
  const temporaryArticle = buildTemporaryArticle(seed);
  const displayMeta = getArticleDisplayMeta(temporaryArticle);
  const candidateTags = (seed.tags ?? []).filter((tag) => {
    const normalizedTag = normalizeTopicSlug(tag);
    return Boolean(normalizedTag && !isGenericTopicSlug(normalizedTag) && normalizedTag !== "rss" && normalizedTag !== "mundo-rss" && !normalizedTag.startsWith("rss-"));
  });
  const normalizedCountry =
    normalizeCountry(seed.country) ??
    displayMeta.countrySlug ??
    normalizeCountry(seed.region) ??
    null;
  const topicSlug =
    getPrimaryTopicSlug({
      topic: null,
      tags: candidateTags,
      category: seed.category ?? null
    }) ?? null;
  const tags = topicSlug && !(seed.tags ?? []).includes(topicSlug)
    ? [...new Set([...(seed.tags ?? []), topicSlug])]
    : [...new Set(seed.tags ?? [])];

  return {
    country: normalizedCountry,
    topic_slug: topicSlug,
    section_slug: deriveSectionSlug({
      is_impact: seed.is_impact ?? false,
      impact_format: seed.impact_format ?? null,
      region: seed.region
    }),
    tags
  };
}

export function createEmptyTaxonomyQualitySummary(): TaxonomyQualitySummary {
  return {
    articles_without_country: 0,
    articles_without_topic: 0,
    articles_without_section: 0,
    articles_with_fallback_taxonomy: 0,
    taxonomy_inconsistent: 0
  };
}

function isLatamCountrySlug(country: string | null | undefined): boolean {
  return ["argentina", "brasil", "chile", "mexico", "uruguay", "paraguay", "bolivia", "peru", "colombia", "ecuador", "venezuela", "costa-rica", "panama", "cuba"].includes(country ?? "");
}

export function finalizeArticleTaxonomy<T extends {
    title: string;
    excerpt: string;
    content: string | null;
    source_name: string;
    region: Article["region"];
    category: string;
    tags: string[];
    country: string | null;
    topic_slug: string | null;
    section_slug: string | null;
    is_impact?: boolean;
    impact_format?: Article["impact_format"] | null;
    raw?: Record<string, unknown>;
  }>(
  article: T,
  sourceType: "api" | "rss"
): T & {
  taxonomy_meta: NonNullable<NormalizedArticle["taxonomy_meta"]>;
  raw: Record<string, unknown>;
} {
  const missingCountry = !article.country;
  const missingTopic = !article.topic_slug;
  const missingSection = !article.section_slug;

  const fallbackCountry = article.country ?? (normalizeCountry(article.region) ?? "internacional");
  const fallbackTopic =
    article.topic_slug ??
    getPrimaryTopicSlug({
      topic: null,
      tags: article.tags,
      category: article.category
    }) ??
    normalizeTopicSlug(article.category) ??
    "actualidad-internacional";
  let fallbackSection =
    article.section_slug ||
    deriveSectionSlug({
      is_impact: article.is_impact ?? false,
      impact_format: article.impact_format ?? null,
      region: article.region
    });
  const inconsistencyReasons: string[] = [];

  if (isLatamCountrySlug(fallbackCountry) && fallbackSection === "mundo") {
    inconsistencyReasons.push("latam_country_with_mundo_section");
    fallbackSection = "latinoamerica";
  }

  const taxonomyMeta = {
    source_type: sourceType,
    source_name: article.source_name,
    missing_country: missingCountry,
    missing_topic: missingTopic,
    missing_section: missingSection,
    used_fallback_taxonomy: missingCountry || missingTopic || missingSection || inconsistencyReasons.length > 0,
    taxonomy_inconsistent: inconsistencyReasons.length > 0,
    inconsistency_reasons: inconsistencyReasons
  };

  if (taxonomyMeta.used_fallback_taxonomy || taxonomyMeta.taxonomy_inconsistent) {
    console.warn(
      `[taxonomy][${sourceType}][${article.source_name}] title="${article.title}" fallback=${taxonomyMeta.used_fallback_taxonomy} inconsistent=${taxonomyMeta.taxonomy_inconsistent} reasons=${taxonomyMeta.inconsistency_reasons.join(",") || "none"}`
    );
  }

  return {
    ...article,
    country: fallbackCountry,
    topic_slug: fallbackTopic,
    section_slug: fallbackSection,
    tags:
      fallbackTopic && !article.tags.includes(fallbackTopic)
        ? [...article.tags, fallbackTopic]
        : article.tags,
    taxonomy_meta: taxonomyMeta,
    raw: {
      ...(article.raw ?? {}),
      taxonomy_meta: taxonomyMeta
    }
  };
}

export function summarizeTaxonomyQuality(
  articles: Array<{ taxonomy_meta?: NormalizedArticle["taxonomy_meta"] }>
): TaxonomyQualitySummary {
  return articles.reduce((summary, article) => {
    if (article.taxonomy_meta?.missing_country) {
      summary.articles_without_country += 1;
    }
    if (article.taxonomy_meta?.missing_topic) {
      summary.articles_without_topic += 1;
    }
    if (article.taxonomy_meta?.missing_section) {
      summary.articles_without_section += 1;
    }
    if (article.taxonomy_meta?.used_fallback_taxonomy) {
      summary.articles_with_fallback_taxonomy += 1;
    }
    if (article.taxonomy_meta?.taxonomy_inconsistent) {
      summary.taxonomy_inconsistent += 1;
    }
    return summary;
  }, createEmptyTaxonomyQualitySummary());
}

export function logTaxonomyQualitySummary(input: {
  sourceType: "api" | "rss";
  sourceName: string;
  taxonomy: TaxonomyQualitySummary;
}) {
  console.info(
    `[taxonomy][${input.sourceType}][${input.sourceName}] without_country=${input.taxonomy.articles_without_country} without_topic=${input.taxonomy.articles_without_topic} without_section=${input.taxonomy.articles_without_section} with_fallback=${input.taxonomy.articles_with_fallback_taxonomy} inconsistent=${input.taxonomy.taxonomy_inconsistent}`
  );
}
