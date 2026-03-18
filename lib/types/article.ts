export type RegionValue =
  | "Mundo"
  | "LatAm"
  | "EE.UU."
  | "Europa"
  | "Asia"
  | "Medio Oriente"
  | "UY"
  | "AR"
  | "BR"
  | "MX"
  | "CL";

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

export type ImpactFormat = "analysis" | "editorial" | "opinion" | "columnist";

export interface EditorialSections {
  que_esta_pasando: string;
  claves_del_dia: string;
  que_significa_para_america_latina: string;
  por_que_importa: string;
}

export interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  editorial_context?: string | null;
  latam_angle?: string | null;
  faq_items?: Array<{
    question: string;
    answer: string;
  }> | null;
  image_url: string;
  source_name: string;
  source_url: string;
  region: RegionValue;
  category: string;
  tags: string[];
  countries?: string[] | null;
  impact_format?: ImpactFormat | null;
  editorial_sections?: EditorialSections | null;
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
  latestEditorial: Article | null;
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
