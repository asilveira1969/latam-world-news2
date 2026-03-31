import {
  getCountryLabel,
  getPrimaryTopicSlug,
  getTopicLabel,
  isLatamCountryCode,
  normalizeCountry
} from "@/lib/hubs";
import { cleanPlainText } from "@/lib/text/clean";
import type { Article } from "@/lib/types/article";

type CountryDefinition = {
  slug: string;
  label: string;
  aliases: string[];
  primaryAliases?: string[];
};

type CountryMatch = {
  slug: string;
  label: string;
  score: number;
};

export type ArticleDisplayMeta = {
  label: string;
  href: string;
  countrySlug: string | null;
  countryLabel: string | null;
  categoryLabel: string;
  sectionLabel: string;
  topicSlug: string;
  topicLabel: string;
  topicHref: string;
  isInternationalFallback: boolean;
};

const COUNTRY_DEFINITIONS: CountryDefinition[] = [
  { slug: "alemania", label: "Alemania", aliases: ["alemania", "aleman"], primaryAliases: ["alemania"] },
  { slug: "arabia-saudita", label: "Arabia Saudita", aliases: ["arabia saudita", "saudi"], primaryAliases: ["arabia saudita"] },
  { slug: "argentina", label: "Argentina", aliases: ["argentina", "argentino"], primaryAliases: ["argentina"] },
  { slug: "bolivia", label: "Bolivia", aliases: ["bolivia", "boliviano"], primaryAliases: ["bolivia"] },
  { slug: "brasil", label: "Brasil", aliases: ["brasil", "brasile"], primaryAliases: ["brasil"] },
  { slug: "canada", label: "Canada", aliases: ["canada", "canad"], primaryAliases: ["canada"] },
  { slug: "chile", label: "Chile", aliases: ["chile", "chileno"], primaryAliases: ["chile"] },
  { slug: "china", label: "China", aliases: ["china", "chino", "beijing", "pekin"], primaryAliases: ["china"] },
  { slug: "colombia", label: "Colombia", aliases: ["colombia", "colomb"], primaryAliases: ["colombia"] },
  { slug: "corea-del-sur", label: "Corea del Sur", aliases: ["corea del sur", "surcore"], primaryAliases: ["corea del sur"] },
  { slug: "costa-rica", label: "Costa Rica", aliases: ["costa rica", "costarricense"], primaryAliases: ["costa rica"] },
  { slug: "cuba", label: "Cuba", aliases: ["cuba", "cubano"], primaryAliases: ["cuba"] },
  { slug: "ecuador", label: "Ecuador", aliases: ["ecuador", "ecuator"], primaryAliases: ["ecuador"] },
  { slug: "egipto", label: "Egipto", aliases: ["egipto", "egipcio"], primaryAliases: ["egipto"] },
  { slug: "espana", label: "Espana", aliases: ["espana", "espan", "madrid", "barcelona", "valencia"], primaryAliases: ["espana"] },
  {
    slug: "estados-unidos",
    label: "Estados Unidos",
    aliases: ["estados unidos", "ee uu", "eeuu", "e.u.", "washington", "nueva york", "new york", "trump"],
    primaryAliases: ["estados unidos", "ee uu", "eeuu"]
  },
  { slug: "francia", label: "Francia", aliases: ["francia", "frances", "paris", "marsella"], primaryAliases: ["francia"] },
  { slug: "india", label: "India", aliases: ["india", "indio"], primaryAliases: ["india"] },
  { slug: "iran", label: "Iran", aliases: ["iran", "irani", "teheran"], primaryAliases: ["iran"] },
  { slug: "iraq", label: "Iraq", aliases: ["iraq", "iraqui", "bagdad"], primaryAliases: ["iraq"] },
  { slug: "israel", label: "Israel", aliases: ["israel", "israeli"], primaryAliases: ["israel"] },
  { slug: "italia", label: "Italia", aliases: ["italia", "italiano", "roma"], primaryAliases: ["italia"] },
  { slug: "japon", label: "Japon", aliases: ["japon", "japones", "tokio"], primaryAliases: ["japon"] },
  { slug: "mexico", label: "Mexico", aliases: ["mexico", "mexican"], primaryAliases: ["mexico"] },
  { slug: "panama", label: "Panama", aliases: ["panama", "panam"], primaryAliases: ["panama"] },
  { slug: "paraguay", label: "Paraguay", aliases: ["paraguay", "paraguayo"], primaryAliases: ["paraguay"] },
  { slug: "peru", label: "Peru", aliases: ["peru", "peruan"], primaryAliases: ["peru"] },
  { slug: "reino-unido", label: "Reino Unido", aliases: ["reino unido", "britan", "londres", "uk"], primaryAliases: ["reino unido"] },
  { slug: "rusia", label: "Rusia", aliases: ["rusia", "ruso", "moscu"], primaryAliases: ["rusia"] },
  { slug: "turquia", label: "Turquia", aliases: ["turquia", "turco"], primaryAliases: ["turquia"] },
  { slug: "ucrania", label: "Ucrania", aliases: ["ucrania", "ucran"], primaryAliases: ["ucrania"] },
  { slug: "uruguay", label: "Uruguay", aliases: ["uruguay", "urugu"], primaryAliases: ["uruguay"] },
  { slug: "venezuela", label: "Venezuela", aliases: ["venezuela", "venezol"], primaryAliases: ["venezuela"] }
];

function normalizeForMatch(value: string): string {
  return cleanPlainText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, " ")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreTextMatches(text: string, aliases: string[]): number {
  return aliases.reduce((total, alias) => {
    const normalizedAlias = normalizeForMatch(alias).trim();
    if (!normalizedAlias) {
      return total;
    }

    const escaped = normalizedAlias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
    const regex = new RegExp(`\\b${escaped}\\b`, "g");
    const matches = text.match(regex);
    return total + (matches?.length ?? 0);
  }, 0);
}

function scoreCountryCandidates(article: Article): CountryMatch[] {
  const normalizedTitle = normalizeForMatch(article.title);
  const normalizedExcerpt = normalizeForMatch(article.excerpt);
  const normalizedBody = normalizeForMatch(article.content ?? "");
  const normalizedSource = normalizeForMatch(article.source_name);
  const seededCountries = new Set(
    [article.country, ...(article.countries ?? [])]
      .map((country) => normalizeCountry(country))
      .filter((country): country is string => Boolean(country))
  );

  if (isLatamCountryCode(article.region)) {
    const regionCountry = normalizeCountry(article.region);
    if (regionCountry) {
      seededCountries.add(regionCountry);
    }
  }

  return COUNTRY_DEFINITIONS.map((country) => {
    const seeded = seededCountries.has(country.slug) ? 10 : 0;
    const titleScore = scoreTextMatches(normalizedTitle, country.aliases) * 6;
    const titlePrimaryScore = scoreTextMatches(normalizedTitle, country.primaryAliases ?? [country.label]) * 10;
    const excerptScore = scoreTextMatches(normalizedExcerpt, country.aliases) * 3;
    const bodyScore = scoreTextMatches(normalizedBody, country.aliases);
    const sourceScore = scoreTextMatches(normalizedSource, country.aliases) * 2;

    return {
      slug: country.slug,
      label: country.label,
      score: seeded + titleScore + titlePrimaryScore + excerptScore + bodyScore + sourceScore
    };
  })
    .filter((country) => country.score > 0)
    .sort((a, b) => b.score - a.score);
}

function detectPrimaryCountryFromHeuristics(article: Article): { slug: string; label: string } | null {
  const matches = scoreCountryCandidates(article);
  const top = matches[0];
  const second = matches[1];

  if (!top) {
    return null;
  }

  if (top.score < 8) {
    return null;
  }

  if (second && top.score - second.score < 4) {
    return null;
  }

  return { slug: top.slug, label: top.label };
}

function resolvePrimaryCountry(article: Article): { slug: string; label: string } | null {
  const canonicalCountry =
    normalizeCountry(article.country) ??
    (article.countries ?? [])
      .map((country) => normalizeCountry(country))
      .find((country): country is string => Boolean(country)) ??
    normalizeCountry(article.region);

  if (canonicalCountry) {
    return {
      slug: canonicalCountry,
      label: getCountryLabel(canonicalCountry)
    };
  }

  const detectedCountry = detectPrimaryCountryFromHeuristics(article);
  if (!detectedCountry) {
    return null;
  }

  const normalizedDetectedCountry = normalizeCountry(detectedCountry.slug);
  if (!normalizedDetectedCountry) {
    return null;
  }

  return {
    slug: normalizedDetectedCountry,
    label: getCountryLabel(normalizedDetectedCountry)
  };
}

function getSectionMeta(article: Article): { label: string; href: string } {
  if (article.section_slug === "latinoamerica" || article.region === "LatAm") {
    return { label: "Latinoamerica", href: "/latinoamerica" };
  }
  if (article.section_slug === "eeuu" || article.region === "EE.UU.") {
    return { label: "Estados Unidos", href: "/eeuu" };
  }
  if (article.section_slug === "europa" || article.region === "Europa") {
    return { label: "Europa", href: "/europa" };
  }
  if (article.section_slug === "asia" || article.region === "Asia") {
    return { label: "Asia", href: "/asia" };
  }
  if (article.section_slug === "medio-oriente" || article.region === "Medio Oriente") {
    return { label: "Medio Oriente", href: "/medio-oriente" };
  }
  if (article.section_slug === "tecnologia") {
    return { label: "Tecnologia", href: "/tecnologia" };
  }
  if (article.section_slug === "energia") {
    return { label: "Energia", href: "/energia" };
  }
  if (article.section_slug === "economia-global") {
    return { label: "Economia Global", href: "/economia-global" };
  }
  return { label: "Mundo", href: "/mundo" };
}

export function getArticleDisplayMeta(article: Article): ArticleDisplayMeta {
  const primaryCountry = resolvePrimaryCountry(article);
  const sectionMeta = getSectionMeta(article);
  const topicSlug = getPrimaryTopicSlug({
    topic: article.topic_slug ?? null,
    tags: article.tags,
    category: article.category,
    title: article.title,
    excerpt: article.excerpt,
    content: article.content,
    sourceName: article.source_name
  });
  const topicLabel = getTopicLabel(topicSlug);
  const sectionLabel = primaryCountry?.label ?? sectionMeta.label;
  const href = primaryCountry ? `/pais/${primaryCountry.slug}` : sectionMeta.href;

  return {
    label: `${sectionLabel} | ${topicLabel}`,
    href,
    countrySlug: primaryCountry?.slug ?? null,
    countryLabel: primaryCountry?.label ?? null,
    categoryLabel: topicLabel,
    sectionLabel,
    topicSlug,
    topicLabel,
    topicHref: `/tema/${topicSlug}`,
    isInternationalFallback: !primaryCountry
  };
}
