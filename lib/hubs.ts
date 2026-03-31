import { cleanPlainText } from "@/lib/text/clean";

type CountryDefinition = {
  slug: string;
  label: string;
  aliases: string[];
  regionCode?: string;
};

type TopicDefinition = {
  slug: string;
  label: string;
  aliases: string[];
  titleKeywords: string[];
  bodyKeywords: string[];
};

type TopicResolutionInput = {
  topic?: string | null;
  tags?: string[] | null;
  category?: string | null;
  title?: string | null;
  excerpt?: string | null;
  content?: string | null;
  sourceName?: string | null;
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

const TOPIC_DEFINITIONS: TopicDefinition[] = [
  {
    slug: "politica",
    label: "Politica",
    aliases: [
      "politica",
      "gobierno",
      "diplomacia",
      "elecciones",
      "eleccion",
      "parlamento",
      "congreso",
      "senado",
      "presidencia",
      "presidente"
    ],
    titleKeywords: ["gobierno", "presidente", "eleccion", "elecciones", "senado", "congreso", "parlamento", "diplomacia", "ministro"],
    bodyKeywords: ["gobierno", "presidente", "eleccion", "elecciones", "senado", "congreso", "parlamento", "diplomacia", "ministerio", "canciller", "votacion", "coalicion"]
  },
  {
    slug: "economia",
    label: "Economia",
    aliases: ["economia", "mercados", "finanzas", "negocios", "comercio", "inflacion", "empresas", "banco"],
    titleKeywords: ["economia", "mercado", "mercados", "inflacion", "tasas", "banco", "comercio", "arancel", "empresa", "exportacion"],
    bodyKeywords: ["economia", "mercado", "mercados", "inflacion", "tasas", "banco", "comercio", "arancel", "empresa", "finanzas", "inversion", "exportacion", "importacion"]
  },
  {
    slug: "seguridad",
    label: "Seguridad",
    aliases: ["seguridad", "guerra", "conflicto", "militar", "defensa", "crimen", "violencia"],
    titleKeywords: ["ataque", "bombardeo", "guerra", "misil", "crimen", "homicidio", "seguridad", "militar", "ejercito", "cartel"],
    bodyKeywords: ["ataque", "bombardeo", "guerra", "misil", "crimen", "homicidio", "seguridad", "militar", "ejercito", "fuerzas armadas", "violencia", "conflicto", "terrorismo", "guardia"]
  },
  {
    slug: "sociedad",
    label: "Sociedad",
    aliases: ["sociedad", "educacion", "comunidad", "protestas", "vivienda"],
    titleKeywords: ["escuela", "universidad", "protesta", "vivienda", "comunidad", "docentes", "educacion", "salarios"],
    bodyKeywords: ["escuela", "universidad", "protesta", "vivienda", "comunidad", "docentes", "educacion", "salarios", "ciudadania", "movilizacion"]
  },
  {
    slug: "migracion",
    label: "Migracion",
    aliases: ["migracion", "migrantes", "refugiados", "frontera", "deportacion", "asilo"],
    titleKeywords: ["migrante", "migrantes", "refugiado", "refugiados", "frontera", "deportacion", "asilo", "diaspora"],
    bodyKeywords: ["migrante", "migrantes", "refugiado", "refugiados", "frontera", "deportacion", "asilo", "diaspora", "visado", "exilio"]
  },
  {
    slug: "energia",
    label: "Energia",
    aliases: ["energia", "petroleo", "gas", "electricidad", "crudo", "opec"],
    titleKeywords: ["petroleo", "gas", "energia", "electricidad", "crudo", "opec", "refineria"],
    bodyKeywords: ["petroleo", "gas", "energia", "electricidad", "crudo", "opec", "refineria", "oleoducto", "combustible"]
  },
  {
    slug: "tecnologia",
    label: "Tecnologia",
    aliases: ["tecnologia", "inteligencia artificial", "ia", "software", "chips", "semiconductores", "ciberseguridad"],
    titleKeywords: ["tecnologia", "inteligencia artificial", "semiconductor", "semiconductores", "software", "chip", "chips", "ciberataque", "ciberseguridad", "plataforma digital"],
    bodyKeywords: ["tecnologia", "inteligencia artificial", "semiconductor", "semiconductores", "software", "chip", "chips", "ciberataque", "ciberseguridad", "plataforma digital", "algoritmo", "app", "aplicacion", "red social"]
  },
  {
    slug: "cultura",
    label: "Cultura",
    aliases: ["cultura", "musica", "cine", "libros", "arte"],
    titleKeywords: ["musica", "cine", "festival", "libro", "arte", "teatro", "serie", "pelicula", "cultural"],
    bodyKeywords: ["musica", "cine", "festival", "libro", "arte", "teatro", "serie", "pelicula", "cultural", "escena", "artista"]
  },
  {
    slug: "deportes",
    label: "Deportes",
    aliases: ["deportes", "futbol", "tenis", "moto gp", "liga", "mundial"],
    titleKeywords: ["futbol", "partido", "liga", "gol", "mundial", "tenis", "deporte", "copa", "torneo", "moto gp"],
    bodyKeywords: ["futbol", "partido", "liga", "gol", "mundial", "tenis", "deporte", "copa", "torneo", "moto gp", "campeonato"]
  },
  {
    slug: "medio-ambiente",
    label: "Medio ambiente",
    aliases: ["medio ambiente", "clima", "ambiental", "ecologia", "sostenibilidad"],
    titleKeywords: ["clima", "ambiental", "incendio forestal", "sequía", "sequia", "emisiones", "biodiversidad", "contaminacion"],
    bodyKeywords: ["clima", "ambiental", "incendio forestal", "sequia", "emisiones", "biodiversidad", "contaminacion", "ecologia", "huracan", "lluvias"]
  },
  {
    slug: "salud",
    label: "Salud",
    aliases: ["salud", "hospital", "medicina", "virus", "vacuna"],
    titleKeywords: ["salud", "hospital", "vacuna", "virus", "epidemia", "medicina", "medico", "sanitario"],
    bodyKeywords: ["salud", "hospital", "vacuna", "virus", "epidemia", "medicina", "medico", "sanitario", "pacientes"]
  },
  {
    slug: "justicia",
    label: "Justicia",
    aliases: ["justicia", "tribunales", "fiscalia", "corte", "juicio"],
    titleKeywords: ["tribunal", "juez", "jueza", "corte", "fiscalia", "fiscal", "juicio", "demanda", "condena", "sentencia"],
    bodyKeywords: ["tribunal", "juez", "jueza", "corte", "fiscalia", "fiscal", "juicio", "demanda", "condena", "sentencia", "acusacion", "proceso judicial"]
  },
  {
    slug: "internacional",
    label: "Internacional",
    aliases: ["internacional", "mundo", "global", "actualidad internacional"],
    titleKeywords: [],
    bodyKeywords: []
  }
];

const COUNTRY_BY_SLUG = new Map(COUNTRY_DEFINITIONS.map((country) => [country.slug, country]));
const COUNTRY_ALIAS_MAP = new Map<string, string>();
const TOPIC_BY_SLUG = new Map(TOPIC_DEFINITIONS.map((topic) => [topic.slug, topic]));
const TOPIC_ALIAS_MAP = new Map<string, string>();
const INTERNAL_TAGS = new Set(["rss", "mundo-rss", "rss-rt", "rss-france24-es", "rss-bbc-mundo", "rss-dw-es", "rss-elpais", "newsdata", "aggregator"]);
const GENERIC_TOPIC_SLUGS = new Set(["internacional", "mundo", "latam", "america-latina"]);

for (const country of COUNTRY_DEFINITIONS) {
  COUNTRY_ALIAS_MAP.set(country.slug, country.slug);
  COUNTRY_ALIAS_MAP.set(country.slug.replace(/-/g, " "), country.slug);

  for (const alias of country.aliases) {
    COUNTRY_ALIAS_MAP.set(alias, country.slug);
  }
}

for (const topic of TOPIC_DEFINITIONS) {
  TOPIC_ALIAS_MAP.set(topic.slug, topic.slug);
  TOPIC_ALIAS_MAP.set(topic.slug.replace(/-/g, " "), topic.slug);
  TOPIC_ALIAS_MAP.set(topic.label.toLowerCase(), topic.slug);

  for (const alias of topic.aliases) {
    TOPIC_ALIAS_MAP.set(alias, topic.slug);
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

function normalizeTopicKey(input: string): string {
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

function topicTextToSlug(value: string): string {
  return cleanPlainText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function normalizeForMatch(value: string): string {
  return cleanPlainText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function countKeywordMatches(text: string, keywords: string[]): number {
  return keywords.reduce((score, keyword) => {
    const normalized = normalizeForMatch(keyword);
    if (!normalized) {
      return score;
    }

    const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
    const regex = new RegExp(`\\b${escaped}\\b`, "g");
    return score + (text.match(regex)?.length ?? 0);
  }, 0);
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

export function normalizeTopicSlug(input: string | null | undefined): string | null {
  if (!input) {
    return null;
  }

  const normalized = normalizeTopicKey(String(input));
  if (!normalized) {
    return null;
  }

  const direct = TOPIC_ALIAS_MAP.get(normalized);
  if (direct) {
    return direct;
  }

  const slug = topicTextToSlug(normalized);
  return TOPIC_BY_SLUG.has(slug) ? slug : null;
}

export function toTopicSlug(value: string): string {
  return normalizeTopicSlug(value) ?? topicTextToSlug(value);
}

export function getTopicLabel(slug: string): string {
  const normalized = normalizeTopicSlug(slug);
  if (!normalized) {
    return toTitleCaseWords(normalizeTopicKey(slug));
  }

  return TOPIC_BY_SLUG.get(normalized)?.label ?? toTitleCaseWords(normalized.replace(/-/g, " "));
}

export function getTopicCatalog(): Array<{ slug: string; label: string }> {
  return TOPIC_DEFINITIONS.map((topic) => ({ slug: topic.slug, label: topic.label }));
}

export function isGenericTopicSlug(slug: string | null | undefined): boolean {
  const normalized = normalizeTopicSlug(slug);
  return normalized ? GENERIC_TOPIC_SLUGS.has(normalized) : false;
}

export function resolveTopicSlug(input: TopicResolutionInput): string {
  const explicitTopic = normalizeTopicSlug(input.topic);
  if (explicitTopic) {
    return explicitTopic;
  }

  const scores = new Map<string, number>();
  for (const topic of TOPIC_DEFINITIONS) {
    scores.set(topic.slug, topic.slug === "internacional" ? 1 : 0);
  }

  const normalizedCategory = normalizeTopicSlug(input.category);
  if (normalizedCategory) {
    scores.set(
      normalizedCategory,
      (scores.get(normalizedCategory) ?? 0) + (normalizedCategory === "internacional" ? 2 : 7)
    );
  }

  for (const tag of input.tags ?? []) {
    const cleanedTag = cleanPlainText(tag).trim().toLowerCase();
    if (!cleanedTag || INTERNAL_TAGS.has(cleanedTag)) {
      continue;
    }

    const normalizedTag = normalizeTopicSlug(cleanedTag);
    if (normalizedTag) {
      scores.set(
        normalizedTag,
        (scores.get(normalizedTag) ?? 0) + (normalizedTag === "internacional" ? 1 : 5)
      );
    }
  }

  const title = normalizeForMatch(input.title ?? "");
  const excerpt = normalizeForMatch(input.excerpt ?? "");
  const content = normalizeForMatch(input.content ?? "");
  const sourceName = normalizeForMatch(input.sourceName ?? "");

  for (const topic of TOPIC_DEFINITIONS) {
    if (topic.slug === "internacional") {
      continue;
    }

    const score =
      countKeywordMatches(title, topic.titleKeywords) * 6 +
      countKeywordMatches(excerpt, topic.titleKeywords) * 3 +
      countKeywordMatches(content, [...topic.titleKeywords, ...topic.bodyKeywords]) +
      countKeywordMatches(sourceName, topic.titleKeywords) * 2;

    if (score > 0) {
      scores.set(topic.slug, (scores.get(topic.slug) ?? 0) + score);
    }
  }

  const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  const [winner, second] = sorted;

  if (!winner || winner[1] <= 0) {
    return "internacional";
  }

  if (winner[0] === "tecnologia" && winner[1] < 8) {
    return second && second[1] >= 6 ? second[0] : "internacional";
  }

  if (winner[1] < 5) {
    return "internacional";
  }

  if (second && winner[1] - second[1] <= 1 && second[1] >= 6) {
    return second[0];
  }

  return winner[0];
}

export function getPrimaryTopicSlug(input: TopicResolutionInput): string {
  return resolveTopicSlug(input);
}

export function validateTopicAssignment(input: TopicResolutionInput & { topicSlug?: string | null }): string[] {
  const topicSlug = normalizeTopicSlug(input.topicSlug) ?? resolveTopicSlug(input);
  const text = normalizeForMatch(`${input.title ?? ""}\n${input.excerpt ?? ""}\n${input.content ?? ""}`);
  const reasons: string[] = [];

  const tecnologiaScore = countKeywordMatches(
    text,
    TOPIC_BY_SLUG.get("tecnologia")?.bodyKeywords ?? []
  );
  const justiciaScore = countKeywordMatches(text, TOPIC_BY_SLUG.get("justicia")?.bodyKeywords ?? []);
  const politicaScore = countKeywordMatches(text, TOPIC_BY_SLUG.get("politica")?.bodyKeywords ?? []);
  const culturaScore = countKeywordMatches(text, TOPIC_BY_SLUG.get("cultura")?.bodyKeywords ?? []);
  const seguridadScore = countKeywordMatches(text, TOPIC_BY_SLUG.get("seguridad")?.bodyKeywords ?? []);

  if (topicSlug === "tecnologia" && tecnologiaScore === 0 && (politicaScore > 0 || justiciaScore > 0 || culturaScore > 0 || seguridadScore > 0)) {
    reasons.push("technology_without_tech_signals");
  }
  if (topicSlug === "seguridad" && culturaScore >= 2) {
    reasons.push("security_with_culture_signals");
  }
  if (topicSlug === "cultura" && seguridadScore >= 2) {
    reasons.push("culture_with_security_signals");
  }
  if (topicSlug === "politica" && justiciaScore >= 4 && politicaScore === 0) {
    reasons.push("politics_without_political_signals");
  }

  return reasons;
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
