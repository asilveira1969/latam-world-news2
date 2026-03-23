import { getCountryLabel, getCountrySlug, isLatamCountryCode } from "@/lib/hubs";
import { cleanPlainText } from "@/lib/text/clean";
import type { Article } from "@/lib/types/article";

type CountryDefinition = {
  slug: string;
  label: string;
  aliases: string[];
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
  isInternationalFallback: boolean;
};

const COUNTRY_DEFINITIONS: CountryDefinition[] = [
  { slug: "alemania", label: "Alemania", aliases: ["alemania", "aleman"] },
  { slug: "arabia-saudita", label: "Arabia Saudita", aliases: ["arabia saudita", "saudi"] },
  { slug: "argentina", label: "Argentina", aliases: ["argentina", "argentino"] },
  { slug: "bolivia", label: "Bolivia", aliases: ["bolivia", "boliviano"] },
  { slug: "brasil", label: "Brasil", aliases: ["brasil", "brasile"] },
  { slug: "canada", label: "Canada", aliases: ["canada", "canad"] },
  { slug: "chile", label: "Chile", aliases: ["chile", "chileno"] },
  { slug: "china", label: "China", aliases: ["china", "chino", "beijing", "pekin"] },
  { slug: "colombia", label: "Colombia", aliases: ["colombia", "colomb"] },
  { slug: "corea-del-sur", label: "Corea del Sur", aliases: ["corea del sur", "surcore"] },
  { slug: "costa-rica", label: "Costa Rica", aliases: ["costa rica", "costarricense"] },
  { slug: "cuba", label: "Cuba", aliases: ["cuba", "cubano"] },
  { slug: "ecuador", label: "Ecuador", aliases: ["ecuador", "ecuator"] },
  { slug: "egipto", label: "Egipto", aliases: ["egipto", "egipcio"] },
  { slug: "espana", label: "Espana", aliases: ["espana", "espan", "madrid", "barcelona", "valencia"] },
  {
    slug: "estados-unidos",
    label: "Estados Unidos",
    aliases: ["estados unidos", "ee uu", "eeuu", "e.u.", "washington", "nueva york", "new york", "trump"]
  },
  { slug: "francia", label: "Francia", aliases: ["francia", "frances", "paris", "marsella"] },
  { slug: "india", label: "India", aliases: ["india", "indio"] },
  { slug: "iran", label: "Iran", aliases: ["iran", "irani", "teheran"] },
  { slug: "iraq", label: "Iraq", aliases: ["iraq", "iraqui", "bagdad"] },
  { slug: "israel", label: "Israel", aliases: ["israel", "israeli"] },
  { slug: "italia", label: "Italia", aliases: ["italia", "italiano", "roma"] },
  { slug: "japon", label: "Japon", aliases: ["japon", "japones", "tokio"] },
  { slug: "mexico", label: "Mexico", aliases: ["mexico", "mexican"] },
  { slug: "panama", label: "Panama", aliases: ["panama", "panam"] },
  { slug: "paraguay", label: "Paraguay", aliases: ["paraguay", "paraguayo"] },
  { slug: "peru", label: "Peru", aliases: ["peru", "peruan"] },
  { slug: "reino-unido", label: "Reino Unido", aliases: ["reino unido", "britan", "londres", "uk"] },
  { slug: "rusia", label: "Rusia", aliases: ["rusia", "ruso", "moscu"] },
  { slug: "turquia", label: "Turquia", aliases: ["turquia", "turco"] },
  { slug: "ucrania", label: "Ucrania", aliases: ["ucrania", "ucran"] },
  { slug: "uruguay", label: "Uruguay", aliases: ["uruguay", "urugu"] },
  { slug: "venezuela", label: "Venezuela", aliases: ["venezuela", "venezol"] }
];

const CATEGORY_RULES: Array<{ label: string; patterns: RegExp[] }> = [
  {
    label: "Deportes",
    patterns: [/\bfutbol\b/, /\bpartido\b/, /\bliga\b/, /\bgol\b/, /\bmundial\b/, /\bdeporte/]
  },
  {
    label: "Energia",
    patterns: [/\benergia\b/, /\bgas\b/, /\bpetroleo\b/, /\belectric/, /\bopec\b/, /\bcrudo\b/]
  },
  {
    label: "Economia",
    patterns: [/\beconomia\b/, /\binflacion\b/, /\bmercad/, /\bcomercio\b/, /\bfinanz/, /\barancel/]
  },
  {
    label: "Tecnologia",
    patterns: [/\btecnolog/, /\binteligencia artificial\b/, /\bia\b/, /\bchip/, /\bsemiconductor/, /\bdigital/]
  },
  {
    label: "Cultura",
    patterns: [/\bcultura\b/, /\bfrancofonia\b/, /\bfrances\b/, /\baulas\b/, /\bidioma\b/, /\bmusic/, /\bcine\b/, /\blibro/]
  },
  {
    label: "Seguridad",
    patterns: [/\bataque\b/, /\bmisil/, /\bbombarde/, /\bguardia\b/, /\bmilitar/, /\bguerra\b/, /\bconflicto\b/, /\bcolision/, /\baccidente/]
  },
  {
    label: "Politica",
    patterns: [/\beleccion/, /\bvoto\b/, /\bgobierno\b/, /\bpresident/, /\bparlament/, /\bcongreso\b/, /\bministro\b/, /\bdiplom/]
  },
  {
    label: "Sociedad",
    patterns: [/\beducacion\b/, /\bsalud\b/, /\bvivienda\b/, /\bprotesta\b/, /\bhuelga\b/, /\bescuela\b/, /\buniversidad/]
  }
];

function normalizeForMatch(value: string): string {
  return cleanPlainText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, " ");
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
  const seededCountries = new Set((article.countries ?? []).map((country) => getCountrySlug(country)));

  if (isLatamCountryCode(article.region)) {
    seededCountries.add(getCountrySlug(getCountryLabel(article.region)));
  }

  return COUNTRY_DEFINITIONS.map((country) => {
    const seeded = seededCountries.has(country.slug) ? 10 : 0;
    const titleScore = scoreTextMatches(normalizedTitle, country.aliases) * 6;
    const excerptScore = scoreTextMatches(normalizedExcerpt, country.aliases) * 3;
    const bodyScore = scoreTextMatches(normalizedBody, country.aliases);
    const sourceScore = scoreTextMatches(normalizedSource, country.aliases) * 2;

    return {
      slug: country.slug,
      label: country.label,
      score: seeded + titleScore + excerptScore + bodyScore + sourceScore
    };
  })
    .filter((country) => country.score > 0)
    .sort((a, b) => b.score - a.score);
}

function detectPrimaryCountry(article: Article): { slug: string; label: string } | null {
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

function categoryFromRaw(value: string): string {
  const normalized = normalizeForMatch(value);
  if (normalized.includes("polit")) {
    return "Politica";
  }
  if (normalized.includes("econom")) {
    return "Economia";
  }
  if (normalized.includes("energ")) {
    return "Energia";
  }
  if (normalized.includes("tecnolog")) {
    return "Tecnologia";
  }
  if (normalized.includes("cultur")) {
    return "Cultura";
  }
  if (normalized.includes("seguridad") || normalized.includes("geopolit")) {
    return "Seguridad";
  }
  if (normalized.includes("deporte")) {
    return "Deportes";
  }
  if (normalized.includes("sociedad")) {
    return "Sociedad";
  }
  return "Internacional";
}

function detectCategory(article: Article): string {
  const text = normalizeForMatch(`${article.title}\n${article.excerpt}\n${article.content ?? ""}`);

  for (const rule of CATEGORY_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(text))) {
      return rule.label;
    }
  }

  return categoryFromRaw(article.category);
}

export function getArticleDisplayMeta(article: Article): ArticleDisplayMeta {
  const primaryCountry = detectPrimaryCountry(article);
  const categoryLabel = detectCategory(article);
  const sectionLabel = primaryCountry?.label ?? "Internacional";
  const href = primaryCountry ? `/pais/${primaryCountry.slug}` : "/mundo";

  return {
    label: `${sectionLabel} · ${categoryLabel}`,
    href,
    countrySlug: primaryCountry?.slug ?? null,
    countryLabel: primaryCountry?.label ?? null,
    categoryLabel,
    sectionLabel,
    isInternationalFallback: !primaryCountry
  };
}
