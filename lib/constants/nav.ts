import type { RegionKey, RegionValue, SectionKey } from "@/lib/types/article";

export const SITE_NAME = "LATAM World News";
export const SITE_TAGLINE = "Noticias internacionales explicadas para America Latina";

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
  { href: "/mundo", label: "Mundo" },
  { href: "/latinoamerica", label: "Latinoamerica" },
  { href: "/eeuu", label: "EE.UU." },
  { href: "/europa", label: "Europa" },
  { href: "/asia", label: "Asia" },
  { href: "/medio-oriente", label: "Medio Oriente" },
  { href: "/economia-global", label: "Economia" },
  { href: "/energia", label: "Energia" },
  { href: "/tecnologia", label: "Tecnologia" },
  { href: "/impacto", label: "Impacto" },
  { href: "/v2", label: "V2" }
];
