import type { RegionKey, RegionValue, SectionKey } from "@/lib/types/article";

export const SITE_NAME = "LATAM World News";
export const SITE_TAGLINE = "Noticias de LatinoAmerica y el Mundo";

export const REGION_ROUTE_MAP: Record<RegionKey, RegionValue> = {
  mundo: "Mundo",
  latinoamerica: "LatAm",
  eeuu: "EE.UU.",
  europa: "Europa",
  asia: "Asia",
  "medio-oriente": "Medio Oriente"
};

export const REGION_TITLE_MAP: Record<RegionKey, string> = {
  mundo: "Mundo",
  latinoamerica: "Latinoamerica",
  eeuu: "EE.UU.",
  europa: "Europa",
  asia: "Asia",
  "medio-oriente": "Medio Oriente"
};

export const SECTION_TITLE_MAP: Record<SectionKey, string> = {
  mundo: "Mundo",
  latinoamerica: "Latinoamerica",
  eeuu: "EE.UU.",
  europa: "Europa",
  asia: "Asia",
  "medio-oriente": "Medio Oriente",
  "economia-global": "Economia Global",
  energia: "Energia",
  tecnologia: "Tecnologia",
  impacto: "Impacto en LATAM"
};

export const PRIMARY_NAV: Array<{ href: string; label: string }> = [
  { href: "/latinoamerica", label: "Latinoamerica" },
  { href: "/mundo", label: "Mundo" }
];
