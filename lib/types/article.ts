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
  source_type?: "api" | "rss" | null;
  topic_slug?: string | null;
  section_slug?: string | null;
  latamworldnews_summary?: string | null;
  curated_news?: string | null;
  editorial_status?: "pending" | "pending_review" | "ready" | "failed" | null;
  editorial_generated_at?: string | null;
  editorial_model?: string | null;
  editorial_origin?: "generated_metadata_only" | null;
  editorial_input_hash?: string | null;
  editorial_prompt_version?: string | null;
  editorial_validation?: {
    input_hash: string;
    evidence_terms: string[];
    summary_word_count: number;
    validation_version: string;
  } | null;
  editorial_review_status?: "not_requested" | "pending" | "approved" | "rejected" | null;
  editorial_reviewed_at?: string | null;
  editorial_review_notes?: string | null;
  editorial_format?: "brief" | "context" | "latam_impact" | null;
  editorial_key_takeaway?: string | null;
  editorial_what_to_watch?: string | null;
  editorial_latam_impact?: string | null;
  editorial_author?: string | null;
  editorial_updated_at?: string | null;
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
  possible_topic_duplicate?: boolean;
  topic_duplicate_group?: string | null;
  topic_duplicate_confidence?: number | null;
  topic_duplicate_of_slug?: string | null;
  views: number;
}

export interface HomeData {
  ticker: string[];
  heroLead: Article | null;
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
