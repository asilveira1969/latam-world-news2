export type RegionValue =
  | "Mundo"
  | "LatAm"
  | "EE.UU."
  | "Europa"
  | "Asia"
  | "Medio Oriente";

export type RegionKey =
  | "mundo"
  | "latinoamerica"
  | "eeuu"
  | "europa"
  | "asia"
  | "medio-oriente";

export type SectionKey =
  | RegionKey
  | "economia-global"
  | "energia"
  | "tecnologia"
  | "impacto";

export interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string | null;
  image_url: string;
  source_name: string;
  source_url: string;
  region: RegionValue;
  category: string;
  tags: string[];
  published_at: string;
  created_at: string;
  is_featured: boolean;
  is_impact: boolean;
  views: number;
}

export interface HomeData {
  ticker: string[];
  heroLead: Article;
  heroSecondary: Article[];
  impact: Article[];
  latest: Article[];
  regionBlocks: Array<{
    key: RegionKey;
    title: string;
    href: string;
    items: Article[];
  }>;
  trendingTags: string[];
  mostRead: Article[];
}
