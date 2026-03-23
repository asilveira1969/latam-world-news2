import { cleanPlainText } from "@/lib/text/clean";

type CountryDefinition = {
  slug: string;
  label: string;
  aliases: string[];
  regionCode?: string;
};

const COUNTRY_DEFINITIONS: CountryDefinition[] = [
  { slug: "alemania", label: "Alemania", aliases: ["alemania"] },
  { slug: "arabia-saudita", label: "Arabia Saudita", aliases: ["arabia saudita", "saudi", "saudi arabia"] },
  { slug: "argentina", label: "Argentina", aliases: ["argentina", "ar"], regionCode: "AR" },
  { slug: "bolivia", label: "Bolivia", aliases: ["bolivia"] },
  { slug: "brasil", label: "Brasil", aliases: ["brasil", "brazil", "br"], regionCode: "BR" },
  { slug: "canada", label: "Canada", aliases: ["canada"] },
  { slug: "chile", label: "Chile", aliases: ["chile", "cl"], regionCode: "CL" },
  { slug: "china", label: "China", aliases: ["china"] },
  { slug: "colombia", label: "Colombia", aliases: ["colombia"] },
  { slug: "corea-del-sur", label: "Corea del Sur", aliases: ["corea del sur", "south korea"] },
  { slug: "costa-rica", label: "Costa Rica", aliases: ["costa rica"] },
  { slug: "cuba", label: "Cuba", aliases: ["cuba"] },
  { slug: "ecuador", label: "Ecuador", aliases: ["ecuador"] },
  { slug: "egipto", label: "Egipto", aliases: ["egipto", "egypt"] },
  { slug: "espana", label: "Espana", aliases: ["espana", "spain"] },
  {
    slug: "estados-unidos",
    label: "Estados Unidos",
    aliases: ["estados unidos", "ee uu", "eeuu", "usa", "us", "united states"]
  },
  { slug: "francia", label: "Francia", aliases: ["francia", "france"] },
  { slug: "india", label: "India", aliases: ["india"] },
  { slug: "iran", label: "Iran", aliases: ["iran"] },
  { slug: "iraq", label: "Iraq", aliases: ["iraq"] },
  { slug: "israel", label: "Israel", aliases: ["israel"] },
  { slug: "italia", label: "Italia", aliases: ["italia", "italy"] },
  { slug: "japon", label: "Japon", aliases: ["japon", "japan"] },
  { slug: "mexico", label: "Mexico", aliases: ["mexico", "mx"], regionCode: "MX" },
  { slug: "panama", label: "Panama", aliases: ["panama"] },
  { slug: "paraguay", label: "Paraguay", aliases: ["paraguay", "py"], regionCode: "PY" },
  { slug: "peru", label: "Peru", aliases: ["peru"] },
  {
    slug: "reino-unido",
    label: "Reino Unido",
    aliases: ["reino unido", "uk", "united kingdom", "gran bretana"]
  },
  { slug: "rusia", label: "Rusia", aliases: ["rusia", "russia"] },
  { slug: "turquia", label: "Turquia", aliases: ["turquia", "turkey"] },
  { slug: "ucrania", label: "Ucrania", aliases: ["ucrania", "ukraine"] },
  { slug: "uruguay", label: "Uruguay", aliases: ["uruguay", "uy"], regionCode: "UY" },
  { slug: "venezuela", label: "Venezuela", aliases: ["venezuela"] }
];

const COUNTRY_BY_SLUG = new Map(COUNTRY_DEFINITIONS.map((country) => [country.slug, country]));
const COUNTRY_ALIAS_MAP = new Map<string, string>();

for (const country of COUNTRY_DEFINITIONS) {
  COUNTRY_ALIAS_MAP.set(country.slug, country.slug);
  COUNTRY_ALIAS_MAP.set(country.slug.replace(/-/g, " "), country.slug);

  for (const alias of country.aliases) {
    COUNTRY_ALIAS_MAP.set(alias, country.slug);
  }
}

function safelyDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function normalizeCountryKey(input: string): string {
  return cleanPlainText(safelyDecodeURIComponent(input))
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function toTitleCaseWords(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function toTopicSlug(value: string): string {
  return cleanPlainText(value).toLowerCase().replace(/\s+/g, "-");
}

export function getTopicLabel(slug: string): string {
  return decodeURIComponent(slug).replace(/-/g, " ");
}

export function normalizeCountry(input: string | null | undefined): string | null {
  if (!input) {
    return null;
  }

  const normalized = normalizeCountryKey(String(input));
  if (!normalized) {
    return null;
  }

  return COUNTRY_ALIAS_MAP.get(normalized) ?? null;
}

export function getCountryLabel(input: string): string {
  const normalized = normalizeCountry(input);
  if (!normalized) {
    return toTitleCaseWords(normalizeCountryKey(input).replace(/\s+/g, " "));
  }

  return COUNTRY_BY_SLUG.get(normalized)?.label ?? toTitleCaseWords(normalized.replace(/-/g, " "));
}

export function getCountrySlug(value: string): string {
  return normalizeCountry(value) ?? cleanPlainText(value).toLowerCase().replace(/\s+/g, "-");
}

export function getCountryRegionCode(value: string | null | undefined): string | null {
  const normalized = normalizeCountry(value);
  if (!normalized) {
    return null;
  }

  return COUNTRY_BY_SLUG.get(normalized)?.regionCode ?? null;
}

export function isLatamCountryCode(value: string): boolean {
  return ["UY", "AR", "BR", "MX", "CL", "PY"].includes(value.toUpperCase());
}
