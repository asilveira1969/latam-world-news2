import type { D1EditorialClassification, D1EditorialInput } from "@/lib/d1/editorial/types";
import { cleanPlainText } from "@/lib/text/clean";

type Region = D1EditorialClassification["region"];
type CountryRule = { country: string; region: Region; terms: string[] };
type CategoryRule = {
  category: D1EditorialClassification["category"];
  section_slug: D1EditorialClassification["section_slug"];
  topic_slug: string;
  signals: Array<{ term: string; weight: number }>;
  minimumScore: number;
};

// Terms must be complete words or phrases. Do not add stems or prefixes: a
// classifier signal must never be inferred from a substring inside another word.
const COUNTRY_RULES: CountryRule[] = [
  { country: "argentina", region: "LatAm", terms: ["argentina", "argentino", "argentina", "argentinos", "argentinas", "malvinas"] },
  { country: "brasil", region: "LatAm", terms: ["brasil", "brasileno", "brasilena", "brasilenos", "brasilenas"] },
  { country: "chile", region: "LatAm", terms: ["chile", "chileno", "chilena", "chilenos", "chilenas"] },
  { country: "colombia", region: "LatAm", terms: ["colombia", "colombiano", "colombiana", "colombianos", "colombianas"] },
  { country: "ecuador", region: "LatAm", terms: ["ecuador", "ecuatoriano", "ecuatoriana", "ecuatorianos", "ecuatorianas"] },
  { country: "mexico", region: "LatAm", terms: ["mexico", "mexicano", "mexicana", "mexicanos", "mexicanas"] },
  { country: "peru", region: "LatAm", terms: ["peru", "peruano", "peruana", "peruanos", "peruanas"] },
  { country: "venezuela", region: "LatAm", terms: ["venezuela", "venezolano", "venezolana", "venezolanos", "venezolanas"] },
  { country: "uruguay", region: "LatAm", terms: ["uruguay", "uruguayo", "uruguaya", "uruguayos", "uruguayas"] },
  { country: "estados-unidos", region: "EE.UU.", terms: ["ee uu", "eeuu", "estados unidos", "estadounidense", "estadounidenses", "pentagono"] },
  { country: "canada", region: "Mundo", terms: ["canada", "canadiense", "canadienses"] },
  { country: "espana", region: "Europa", terms: ["espana", "espanol", "espanola", "espanoles", "espanolas", "ceuta", "canarias", "canaria"] },
  { country: "reino-unido", region: "Europa", terms: ["reino unido", "londres", "britanico", "britanica", "britanicos", "britanicas", "inglaterra"] },
  { country: "ucrania", region: "Europa", terms: ["ucrania", "ucraniano", "ucraniana", "ucranianos", "ucranianas"] },
  { country: "rusia", region: "Europa", terms: ["rusia", "ruso", "rusa", "rusos", "rusas", "kremlin"] },
  { country: "noruega", region: "Europa", terms: ["noruega", "noruego", "noruega", "noruegos", "noruegas"] },
  { country: "islandia", region: "Europa", terms: ["islandia", "islandes", "islandesa", "islandeses", "islandesas"] },
  { country: "china", region: "Asia", terms: ["china", "chino", "china", "chinos", "chinas", "pekin"] },
  { country: "nepal", region: "Asia", terms: ["nepal", "nepali", "nepales", "nepalesa", "nepaleses", "nepalesas"] },
  { country: "iran", region: "Medio Oriente", terms: ["iran", "irani", "iranies"] },
  { country: "israel", region: "Medio Oriente", terms: ["israel", "israeli", "israelies"] }
];

const CATEGORY_RULES: CategoryRule[] = [
  {
    category: "Energía", section_slug: "energia", topic_slug: "energia", minimumScore: 2,
    signals: [
      { term: "petroleo", weight: 2 }, { term: "petrolero", weight: 2 }, { term: "petrolera", weight: 2 },
      { term: "barril", weight: 2 }, { term: "barriles", weight: 2 }, { term: "gas", weight: 2 },
      { term: "energia", weight: 2 }, { term: "energetico", weight: 2 }, { term: "energetica", weight: 2 },
      { term: "reservas petroleras", weight: 1 }
    ]
  },
  {
    category: "Tecnología", section_slug: "tecnologia", topic_slug: "tecnologia", minimumScore: 2,
    signals: [
      { term: "tecnologia", weight: 2 }, { term: "tecnologico", weight: 2 }, { term: "tecnologica", weight: 2 },
      { term: "antidron", weight: 2 }, { term: "antidrones", weight: 2 }, { term: "dron", weight: 2 }, { term: "drones", weight: 2 },
      { term: "robot", weight: 2 }, { term: "robots", weight: 2 }, { term: "ciborg", weight: 2 }, { term: "ciborgs", weight: 2 },
      { term: "impresion 3d", weight: 1 }, { term: "impresos en 3d", weight: 1 }, { term: "camara", weight: 1 }, { term: "camaras", weight: 1 }
    ]
  },
  {
    category: "Economía", section_slug: "economia-global", topic_slug: "economia", minimumScore: 2,
    signals: [
      { term: "economia", weight: 2 }, { term: "mercado", weight: 2 }, { term: "monopolio", weight: 2 },
      { term: "monopolica", weight: 1 }, { term: "monopolicas", weight: 1 }, { term: "agricultor", weight: 1 }, { term: "agricultores", weight: 1 },
      { term: "ganadero", weight: 1 }, { term: "ganaderos", weight: 1 }, { term: "compania", weight: 1 }, { term: "companias", weight: 1 },
      { term: "acuerdo comercial", weight: 2 }
    ]
  }
];

function normalized(input: string): string {
  return cleanPlainText(input)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Matches only whole normalized words or complete normalized phrases. */
function termPosition(text: string, term: string): number {
  const phrase = normalized(term);
  return phrase ? ` ${text} `.lastIndexOf(` ${phrase} `) : -1;
}

function hasTerm(text: string, term: string): boolean {
  return termPosition(text, term) !== -1;
}

export function classifyD1EditorialInput(input: D1EditorialInput): D1EditorialClassification {
  const title = normalized(input.title);
  const excerpt = normalized(input.excerpt);
  const text = `${title} ${excerpt}`.trim();
  const evidence = new Set<string>();

  const matchedCountries = COUNTRY_RULES
    .map((rule) => {
      const titlePosition = Math.max(...rule.terms.map((term) => termPosition(title, term)));
      const textPosition = Math.max(...rule.terms.map((term) => termPosition(text, term)));
      return { rule, titlePosition, textPosition };
    })
    .filter(({ textPosition }) => textPosition >= 0)
    .sort((left, right) => right.textPosition - left.textPosition);

  for (const { rule } of matchedCountries) evidence.add(rule.country);

  // A named non-US country is stronger geographic evidence than an incidental US
  // actor. Otherwise retain the latest explicit country mention in the headline.
  const primaryCandidates = matchedCountries.filter(({ rule }) => rule.country !== "estados-unidos");
  const primary = (primaryCandidates.length > 0 ? primaryCandidates : matchedCountries)
    .sort((left, right) => (right.titlePosition - left.titlePosition) || (right.textPosition - left.textPosition))[0];

  const categoryRule = CATEGORY_RULES
    .map((rule) => {
      const matches = rule.signals.filter((signal) => hasTerm(text, signal.term));
      return { rule, matches, score: matches.reduce((total, signal) => total + signal.weight, 0) };
    })
    .filter(({ rule, score }) => score >= rule.minimumScore)
    .sort((left, right) => right.score - left.score)[0];

  if (categoryRule) for (const signal of categoryRule.matches) evidence.add(signal.term);

  const countries = [...new Set(matchedCountries.map(({ rule }) => rule.country))];
  const region = primary?.rule.region ?? (hasTerm(text, "suramerica") || hasTerm(text, "latinoamerica") ? "LatAm" : "Mundo");
  const country = primary?.rule.country ?? null;
  const section_slug = categoryRule?.rule.section_slug ?? (
    region === "LatAm" ? "latinoamerica" : region === "EE.UU." ? "eeuu" : region === "Europa" ? "europa" :
    region === "Asia" ? "asia" : region === "Medio Oriente" ? "medio-oriente" : "mundo"
  );
  const topic_slug = categoryRule?.rule.topic_slug ?? (country ?? "internacional");
  const category = categoryRule?.rule.category ?? "Internacional";
  const tags = [...new Set(["rss", "editorial-pendiente", topic_slug, ...countries])];

  return { category, section_slug, region, country, countries, topic_slug, tags, evidence_terms: [...evidence] };
}
