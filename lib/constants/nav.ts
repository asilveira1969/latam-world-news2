import type { RegionKey, RegionValue, SectionKey } from "@/lib/types/article";

export const SITE_NAME = "LATAM World News";
export const SITE_TAGLINE = "Noticias de Latinoam\u00e9rica y el Mundo";

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
  latinoamerica: "Latinoam\u00e9rica",
  eeuu: "EE.UU.",
  europa: "Europa",
  asia: "Asia",
  "medio-oriente": "Medio Oriente"
};

export const SECTION_TITLE_MAP: Record<SectionKey, string> = {
  mundo: "Mundo",
  latinoamerica: "Latinoam\u00e9rica",
  eeuu: "EE.UU.",
  europa: "Europa",
  asia: "Asia",
  "medio-oriente": "Medio Oriente",
  "economia-global": "Econom\u00eda Global",
  energia: "Energ\u00eda",
  tecnologia: "Tecnolog\u00eda",
  impacto: "Impacto en LATAM"
};

export const PRIMARY_NAV: Array<{ href: string; label: string }> = [
  { href: "/latinoamerica", label: "Latinoam\u00e9rica" },
  { href: "/mundo", label: "Mundo" }
];
