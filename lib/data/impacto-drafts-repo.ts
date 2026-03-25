import { cleanExcerpt, cleanPlainText } from "@/lib/text/clean";
import { getSupabaseServiceClient, hasSupabaseServiceEnv } from "@/lib/supabase/server";
import type {
  EditorialSections,
  ImpactoDraftSourceArticle,
  ImpactoDraftStatus,
  ImpactoEditorialDraft
} from "@/lib/types/article";

function sanitizeStringArray(value: unknown, limit: number): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => cleanPlainText(String(item))).filter(Boolean).slice(0, limit);
}

function mapSourceArticle(record: Record<string, unknown>): ImpactoDraftSourceArticle {
  return {
    id: String(record.id ?? ""),
    slug: String(record.slug ?? ""),
    title: cleanPlainText(String(record.title ?? "")),
    excerpt: cleanExcerpt(String(record.excerpt ?? record.summary ?? ""), 320),
    source_name: cleanPlainText(String(record.source_name ?? record.source ?? "Fuente externa")),
    source_url: String(record.source_url ?? record.url ?? "#"),
    region: String(record.region ?? "Mundo") as ImpactoDraftSourceArticle["region"],
    category: cleanPlainText(String(record.category ?? "Geopolitica")),
    tags: sanitizeStringArray(record.tags, 8),
    published_at: String(record.published_at ?? new Date().toISOString()),
    country: record.country ? cleanPlainText(String(record.country)) : null
  };
}

function mapDraft(record: Record<string, unknown>): ImpactoEditorialDraft {
  const sectionsRaw =
    record.editorial_sections &&
    typeof record.editorial_sections === "object" &&
    !Array.isArray(record.editorial_sections)
      ? (record.editorial_sections as Record<string, unknown>)
      : {};

  const sections: EditorialSections = {
    que_esta_pasando: cleanPlainText(String(sectionsRaw.que_esta_pasando ?? "")),
    claves_del_dia: cleanPlainText(String(sectionsRaw.claves_del_dia ?? "")),
    que_significa_para_america_latina: cleanPlainText(
      String(sectionsRaw.que_significa_para_america_latina ?? "")
    ),
    por_que_importa: cleanPlainText(String(sectionsRaw.por_que_importa ?? ""))
  };

  return {
    id: String(record.id ?? ""),
    slug: String(record.slug ?? ""),
    title: cleanPlainText(String(record.title ?? "")),
    excerpt: cleanExcerpt(String(record.excerpt ?? ""), 320),
    seo_title: record.seo_title ? cleanPlainText(String(record.seo_title)) : null,
    seo_description: record.seo_description ? cleanExcerpt(String(record.seo_description), 180) : null,
    editorial_context: record.editorial_context ? cleanExcerpt(String(record.editorial_context), 900) : null,
    editorial_sections: sections,
    tags: sanitizeStringArray(record.tags, 8),
    countries: sanitizeStringArray(record.countries, 6),
    source_articles: Array.isArray(record.source_articles)
      ? (record.source_articles as Record<string, unknown>[]).map(mapSourceArticle)
      : [],
    source_count: Number(record.source_count ?? 0),
    status: String(record.status ?? "pending_review") as ImpactoDraftStatus,
    review_email: record.review_email ? cleanPlainText(String(record.review_email)) : null,
    email_sent_at: record.email_sent_at ? String(record.email_sent_at) : null,
    email_provider: record.email_provider ? cleanPlainText(String(record.email_provider)) : null,
    email_message_id: record.email_message_id ? cleanPlainText(String(record.email_message_id)) : null,
    model: record.model ? cleanPlainText(String(record.model)) : null,
    generated_at: String(record.generated_at ?? new Date().toISOString()),
    approved_at: record.approved_at ? String(record.approved_at) : null,
    published_article_slug: record.published_article_slug
      ? cleanPlainText(String(record.published_article_slug))
      : null,
    created_at: String(record.created_at ?? new Date().toISOString()),
    updated_at: String(record.updated_at ?? new Date().toISOString())
  };
}

export async function listImpactoSourceArticles(input?: {
  limit?: number;
  hoursBack?: number;
}): Promise<ImpactoDraftSourceArticle[]> {
  if (!hasSupabaseServiceEnv) {
    throw new Error("Supabase service credentials are missing.");
  }

  const limit = input?.limit ?? 12;
  const hoursBack = input?.hoursBack ?? 30;
  const fromIso = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();

  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("articles")
    .select("id, slug, title, excerpt, source_name, source_url, region, category, tags, published_at, country")
    .eq("source_type", "rss")
    .eq("is_impact", false)
    .gte("published_at", fromIso)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to load Impacto source articles: ${error.message}`);
  }

  return (data ?? []).map((row: Record<string, unknown>) => mapSourceArticle(row));
}

export async function insertImpactoEditorialDraft(input: {
  slug: string;
  title: string;
  excerpt: string;
  seo_title: string;
  seo_description: string;
  editorial_context: string;
  editorial_sections: EditorialSections;
  tags: string[];
  countries: string[];
  source_articles: ImpactoDraftSourceArticle[];
  status?: ImpactoDraftStatus;
  review_email?: string | null;
  email_sent_at?: string | null;
  email_provider?: string | null;
  email_message_id?: string | null;
  model?: string | null;
}): Promise<ImpactoEditorialDraft> {
  if (!hasSupabaseServiceEnv) {
    throw new Error("Supabase service credentials are missing.");
  }

  const now = new Date().toISOString();
  const supabase = getSupabaseServiceClient();
  const payload = {
    slug: input.slug,
    title: input.title,
    excerpt: input.excerpt,
    seo_title: input.seo_title,
    seo_description: input.seo_description,
    editorial_context: input.editorial_context,
    editorial_sections: input.editorial_sections,
    tags: input.tags,
    countries: input.countries,
    source_articles: input.source_articles,
    source_count: input.source_articles.length,
    status: input.status ?? "pending_review",
    review_email: input.review_email ?? null,
    email_sent_at: input.email_sent_at ?? null,
    email_provider: input.email_provider ?? null,
    email_message_id: input.email_message_id ?? null,
    model: input.model ?? null,
    generated_at: now,
    updated_at: now
  };

  const { data, error } = await supabase
    .from("impacto_editorial_drafts")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to insert Impacto draft: ${error.message}`);
  }

  return mapDraft(data as Record<string, unknown>);
}

export async function markImpactoDraftEmailed(input: {
  id: string;
  reviewEmail: string;
  emailSentAt: string;
  emailProvider: string;
  emailMessageId?: string | null;
}): Promise<void> {
  if (!hasSupabaseServiceEnv) {
    throw new Error("Supabase service credentials are missing.");
  }

  const supabase = getSupabaseServiceClient();
  const { error } = await supabase
    .from("impacto_editorial_drafts")
    .update({
      status: "emailed",
      review_email: input.reviewEmail,
      email_sent_at: input.emailSentAt,
      email_provider: input.emailProvider,
      email_message_id: input.emailMessageId ?? null,
      updated_at: new Date().toISOString()
    })
    .eq("id", input.id);

  if (error) {
    throw new Error(`Failed to update Impacto draft email state: ${error.message}`);
  }
}
