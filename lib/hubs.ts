import { cleanPlainText } from "@/lib/text/clean";

const COUNTRY_LABELS: Record<string, string> = {
  alemania: "Alemania",
  ar: "Argentina",
  "arabia-saudita": "Arabia Saudita",
  argentina: "Argentina",
  br: "Brasil",
  brasil: "Brasil",
  canada: "Canada",
  cl: "Chile",
  chile: "Chile",
  china: "China",
  colombia: "Colombia",
  "corea-del-sur": "Corea del Sur",
  "costa-rica": "Costa Rica",
  cuba: "Cuba",
  ecuador: "Ecuador",
  egipto: "Egipto",
  espana: "Espana",
  "estados-unidos": "Estados Unidos",
  francia: "Francia",
  india: "India",
  iran: "Iran",
  iraq: "Iraq",
  israel: "Israel",
  italia: "Italia",
  japon: "Japon",
  mexico: "Mexico",
  mx: "Mexico",
  panama: "Panama",
  paraguay: "Paraguay",
  peru: "Peru",
  py: "Paraguay",
  "reino-unido": "Reino Unido",
  rusia: "Rusia",
  turquia: "Turquia",
  ucrania: "Ucrania",
  uruguay: "Uruguay",
  uy: "Uruguay",
  venezuela: "Venezuela"
};

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

export function getCountryLabel(slug: string): string {
  const normalized = decodeURIComponent(slug).toLowerCase();
  return COUNTRY_LABELS[normalized] ?? toTitleCaseWords(normalized.replace(/-/g, " "));
}

export function getCountrySlug(value: string): string {
  return cleanPlainText(value).toLowerCase().replace(/\s+/g, "-");
}

export function isLatamCountryCode(value: string): boolean {
  return ["UY", "AR", "BR", "MX", "CL", "PY"].includes(value.toUpperCase());
}
