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

export type ImpactoDraftStatus = "pending_review" | "emailed" | "approved" | "published" | "failed";

export interface ImpactoDraftSourceArticle {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  source_name: string;
  source_url: string;
  region: RegionValue;
  category: string;
  tags: string[];
  published_at: string;
  country?: string | null;
}

export interface ImpactoEditorialDraft {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  seo_title?: string | null;
  seo_description?: string | null;
  editorial_context?: string | null;
  editorial_sections: EditorialSections;
  tags: string[];
  countries?: string[] | null;
  source_articles: ImpactoDraftSourceArticle[];
  source_count: number;
  status: ImpactoDraftStatus;
  review_email?: string | null;
  email_sent_at?: string | null;
  email_provider?: string | null;
  email_message_id?: string | null;
  model?: string | null;
  generated_at: string;
  approved_at?: string | null;
  published_article_slug?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string | null;
  latamworldnews_summary?: string | null;
  curated_news?: string | null;
  editorial_status?: "pending" | "ready" | "failed" | null;
  editorial_generated_at?: string | null;
  editorial_model?: string | null;
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
  country?: string | null;
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
