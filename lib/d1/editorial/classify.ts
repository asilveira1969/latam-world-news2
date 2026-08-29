import type { D1EditorialClassification, D1EditorialInput } from "@/lib/d1/editorial/types";
import { cleanPlainText } from "@/lib/text/clean";

type CountryRule = { country: string; region: D1EditorialClassification["region"]; terms: string[] };

const COUNTRY_RULES: CountryRule[] = [
  { country: "argentina", region: "LatAm", terms: ["argentina", "argentino", "malvinas"] },
  { country: "brasil", region: "LatAm", terms: ["brasil", "brasileñ"] },
  { country: "chile", region: "LatAm", terms: ["chile", "chileno"] },
  { country: "colombia", region: "LatAm", terms: ["colombia", "colombian"] },
  { country: "ecuador", region: "LatAm", terms: ["ecuador", "ecuatorian"] },
  { country: "mexico", region: "LatAm", terms: ["mexico", "mexican"] },
  { country: "peru", region: "LatAm", terms: ["peru", "peruano"] },
  { country: "venezuela", region: "LatAm", terms: ["venezuela", "venezolan"] },
  { country: "uruguay", region: "LatAm", terms: ["uruguay", "uruguayo"] },
  { country: "estados-unidos", region: "EE.UU.", terms: ["ee.uu", "estados unidos", "estadounidense", "trump", "pentagono", "ice"] },
  { country: "reino-unido", region: "Europa", terms: ["reino unido", "londres", "britan", "inglaterra"] },
  { country: "ucrania", region: "Europa", terms: ["ucrania", "ucran"] },
  { country: "rusia", region: "Europa", terms: ["rusia", "ruso", "kremlin"] },
  { country: "china", region: "Asia", terms: ["china", "chino", "pekin"] },
  { country: "iran", region: "Medio Oriente", terms: ["iran", "irani"] },
  { country: "israel", region: "Medio Oriente", terms: ["israel", "israeli"] }
];

const CATEGORY_RULES = [
  { category: "Energía" as const, section_slug: "energia" as const, topic_slug: "energia", terms: ["petroleo", "petrolero", "barriles", "gas", "energia", "reservas"] },
  { category: "Tecnología" as const, section_slug: "tecnologia" as const, topic_slug: "tecnologia", terms: ["tecnologia", "antidron", "dron", "impresos en 3d", "camaras", "robot", "ciborg"] },
  { category: "Economía" as const, section_slug: "economia-global" as const, topic_slug: "economia", terms: ["mercado", "economia", "monopol", "agricult", "ganader", "compañia", "acuerdo comercial"] }
] as const;

function normalized(input: string): string {
  return cleanPlainText(input)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function includesTerm(text: string, term: string): boolean {
  return text.includes(term.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase());
}

export function classifyD1EditorialInput(input: D1EditorialInput): D1EditorialClassification {
  const text = normalized(`${input.title} ${input.excerpt}`);
  const evidence = new Set<string>();
  const matchedCountries = COUNTRY_RULES
    .filter((rule) => rule.terms.some((term) => includesTerm(text, term)))
    .sort((left, right) => {
      const latest = (rule: CountryRule) => Math.max(...rule.terms.map((term) => text.lastIndexOf(term.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase())));
      return latest(right) - latest(left);
    });
  for (const rule of matchedCountries) evidence.add(rule.country);

  const categoryRule = CATEGORY_RULES.find((rule) => rule.terms.some((term) => includesTerm(text, term)));
  if (categoryRule) for (const term of categoryRule.terms) if (includesTerm(text, term)) evidence.add(term);

  const countries = [...new Set(matchedCountries.map((rule) => rule.country))];
  const regional = matchedCountries.find((rule) => rule.region === "LatAm") ?? matchedCountries[0];
  const region = regional?.region ?? (includesTerm(text, "suramerica") || includesTerm(text, "latinoamerica") ? "LatAm" : "Mundo");
  const country = regional?.country ?? countries[0] ?? null;
  const section_slug = categoryRule?.section_slug ?? (
    region === "LatAm" ? "latinoamerica" :
    region === "EE.UU." ? "eeuu" :
    region === "Europa" ? "europa" :
    region === "Asia" ? "asia" :
    region === "Medio Oriente" ? "medio-oriente" : "mundo"
  );
  const topic_slug = categoryRule?.topic_slug ?? (country ?? "internacional");
  const category = categoryRule?.category ?? "Internacional";
  const tags = [...new Set(["rss", "editorial-pendiente", topic_slug, ...countries])];

  return { category, section_slug, region, country, countries, topic_slug, tags, evidence_terms: [...evidence] };
}
