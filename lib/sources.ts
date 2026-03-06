import type { IngestSource } from "@/lib/types";

export type SourceRegistryEntry = IngestSource;
export interface MundoRssSource {
  id: string;
  name: string;
  feedUrl: string;
  region: "Mundo";
  language: "es";
  enabled: boolean;
  priority: number;
  tag: string;
}

export function formatSourceDisplayName(name: string): string {
  const normalized = name.trim().toLowerCase();

  if (normalized === "france 24 espanol") {
    return "France 24 Español";
  }
  if (normalized === "dw espanol") {
    return "DW Español";
  }
  if (normalized === "rt en espanol") {
    return "RT en Español";
  }
  if (normalized === "el pais") {
    return "El País";
  }

  return name;
}

export const SOURCES: SourceRegistryEntry[] = [
  {
    id: "newsdata-uy",
    provider: "newsdata",
    region: "UY",
    language: "es",
    enabled: true,
    params: {}
  },
  {
    id: "newsdata-ar",
    provider: "newsdata",
    region: "AR",
    language: "es",
    enabled: true,
    params: {}
  },
  {
    id: "newsdata-br",
    provider: "newsdata",
    region: "BR",
    language: "pt",
    enabled: true,
    params: {}
  },
  {
    id: "newsdata-mx",
    provider: "newsdata",
    region: "MX",
    language: "es",
    enabled: true,
    params: {}
  },
  {
    id: "newsdata-cl",
    provider: "newsdata",
    region: "CL",
    language: "es",
    enabled: true,
    params: {}
  }
];

export function getEnabledSources(): SourceRegistryEntry[] {
  return SOURCES.filter((source) => source.enabled);
}

export const MUNDO_RSS_SOURCES: MundoRssSource[] = [
  {
    id: "rss-rt",
    name: "RT Actualidad",
    feedUrl: "https://actualidad.rt.com/feeds/all.rss",
    region: "Mundo",
    language: "es",
    enabled: true,
    priority: 10,
    tag: "rss-rt"
  },
  {
    id: "rss-france24-es",
    name: "France 24 Español",
    feedUrl: "https://www.france24.com/es/rss",
    region: "Mundo",
    language: "es",
    enabled: true,
    priority: 20,
    tag: "rss-france24-es"
  },
  {
    id: "rss-bbc-mundo",
    name: "BBC Mundo",
    feedUrl: "https://feeds.bbci.co.uk/mundo/rss.xml",
    region: "Mundo",
    language: "es",
    enabled: true,
    priority: 30,
    tag: "rss-bbc-mundo"
  },
  {
    id: "rss-dw-es",
    name: "DW Español",
    feedUrl: "https://rss.dw.com/rdf/rss-es-all",
    region: "Mundo",
    language: "es",
    enabled: true,
    priority: 40,
    tag: "rss-dw-es"
  }
];

export function getEnabledMundoRssSources(): MundoRssSource[] {
  return [...MUNDO_RSS_SOURCES]
    .filter((source) => source.enabled)
    .sort((a, b) => a.priority - b.priority);
}
