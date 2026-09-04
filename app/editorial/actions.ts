"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { applyD1EditorialDecisions, getD1InternalArticleBySlug, saveD1EditorialDraft } from "@/lib/d1/internal-client";
import { classifyD1EditorialInput } from "@/lib/d1/editorial/classify";
import { endEditorialSession, requireEditorialSession, startEditorialSession } from "@/lib/editorial-dashboard/auth";
import { generateEditorialDraft, type EditorialDraftFields, type EditorialDraftFormat } from "@/lib/editorial-dashboard/ai-drafts";

type EditorialArticle = { id: string; slug: string; title: string; excerpt: string; source_name: string; source_url: string; published_at: string };

function toArticle(value: Record<string, unknown>): EditorialArticle {
  const take = (key: keyof EditorialArticle) => typeof value[key] === "string" ? value[key] as string : "";
  return { id: take("id"), slug: take("slug"), title: take("title"), excerpt: take("excerpt"), source_name: take("source_name"), source_url: take("source_url"), published_at: take("published_at") };
}

export type IndividualEditorialDecisionResult = {
  ok: boolean;
  slug: string;
  decision: "approved" | "rejected";
  error?: string;
};

async function decide(slugs: string[], decision: "approved" | "rejected") {
  await requireEditorialSession();
  const unique = [...new Set(slugs.filter(Boolean))].slice(0, 100);
  if (!unique.length) return;
  const articles = await Promise.all(unique.map((slug) => getD1InternalArticleBySlug(slug)));
  const missing = unique.filter((_, index) => !articles[index]);
  if (missing.length) throw new Error(`No se encontraron artículos: ${missing.join(", ")}`);
  const reviewedAt = new Date().toISOString();
  await applyD1EditorialDecisions(articles.map((value) => {
    const article = toArticle(value as Record<string, unknown>);
    if (decision === "rejected") return { slug: article.slug, editorial_status: "rejected" as const, editorial_review_status: "rejected" as const, editorial_reviewed_at: reviewedAt, audit_note: "Rechazado desde el dashboard editorial autenticado." };
    const classification = classifyD1EditorialInput(article);
    return { slug: article.slug, editorial_status: "ready" as const, editorial_review_status: "approved" as const, editorial_reviewed_at: reviewedAt, audit_note: "Aprobado desde el dashboard editorial autenticado.", ...classification };
  }));
  revalidatePath("/"); revalidatePath("/sitemap.xml"); revalidatePath("/editorial");
}

export async function login(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (!(await startEditorialSession(password))) redirect("/editorial?error=auth");
  redirect("/editorial");
}
export async function logout() { await endEditorialSession(); redirect("/editorial"); }
export async function approveOne(slug: string): Promise<IndividualEditorialDecisionResult> { return decideOne(slug, "approved"); }
export async function rejectOne(slug: string): Promise<IndividualEditorialDecisionResult> { return decideOne(slug, "rejected"); }

async function decideOne(slug: string, decision: "approved" | "rejected"): Promise<IndividualEditorialDecisionResult> {
  const normalizedSlug = typeof slug === "string" ? slug.trim() : "";
  if (!normalizedSlug) return { ok: false, slug: "", decision, error: "No se recibió el identificador del artículo." };
  try {
    await decide([normalizedSlug], decision);
    return { ok: true, slug: normalizedSlug, decision };
  } catch (error) {
    console.error("Individual editorial decision failed", error);
    return { ok: false, slug: normalizedSlug, decision, error: "No se pudo guardar la decisión. La noticia sigue pendiente." };
  }
}

export async function approveSelected(formData: FormData) { await decide(formData.getAll("slug").map(String), "approved"); }
export async function rejectSelected(formData: FormData) { await decide(formData.getAll("slug").map(String), "rejected"); }

function isFormat(value: string): value is EditorialDraftFormat { return value === "brief" || value === "context" || value === "latam_impact"; }
function savedDraft(input: Record<string, unknown>, format: EditorialDraftFormat): EditorialDraftFields {
  const value = (key: string, max: number) => typeof input[key] === "string" ? input[key].replace(/\s+/g, " ").trim().slice(0, max) : "";
  const summary = value("latamworldnews_summary", 900); const key = value("editorial_key_takeaway", 240);
  if (!summary || !key) throw new Error("Qué pasó y La clave son obligatorios para guardar el borrador.");
  if (format === "brief" && (summary.split(/\s+/).length < 60 || summary.split(/\s+/).length > 100)) throw new Error("La noticia breve debe tener entre 60 y 100 palabras.");
  if (format === "context" && !value("editorial_what_to_watch", 500)) throw new Error("Qué mirar ahora es obligatorio para este formato.");
  const now = new Date().toISOString();
  return { editorial_format: format, latamworldnews_summary: summary, editorial_key_takeaway: key, editorial_what_to_watch: value("editorial_what_to_watch", 500), editorial_latam_impact: value("editorial_latam_impact", 500), editorial_author: "Redacción LATAM World News", editorial_generated_at: value("editorial_generated_at", 80) || now, editorial_model: value("editorial_model", 120) || "editorial-manual", editorial_input_hash: value("editorial_input_hash", 128) || "manual-editorial-edit", editorial_prompt_version: "editorial-ai-drafts-v1", editorial_validation: { validation_version: "editorial-ai-drafts-v1", saved_by_editor: true, source_text_stored: false }, editorial_updated_at: now };
}

export async function generateDraft(slug: string, format: string): Promise<{ ok: boolean; draft?: EditorialDraftFields; error?: string }> {
  await requireEditorialSession();
  if (!isFormat(format)) return { ok: false, error: "Formato editorial no válido." };
  const article = await getD1InternalArticleBySlug(slug);
  if (!article) return { ok: false, error: "No se encontró el artículo." };
  try { return { ok: true, draft: await generateEditorialDraft(toArticle(article), format) }; }
  catch (error) { return { ok: false, error: error instanceof Error ? error.message : "No se pudo generar el borrador." }; }
}

export async function saveDraft(slug: string, input: Record<string, unknown>): Promise<{ ok: boolean; draft?: EditorialDraftFields; error?: string }> {
  await requireEditorialSession();
  const format = typeof input.editorial_format === "string" && isFormat(input.editorial_format) ? input.editorial_format : null;
  if (!format) return { ok: false, error: "Selecciona un formato editorial." };
  try {
    const article = await getD1InternalArticleBySlug(slug); if (!article) return { ok: false, error: "No se encontró el artículo." };
    const draft = savedDraft(input, format); const classification = classifyD1EditorialInput(toArticle(article));
    await saveD1EditorialDraft(slug, { ...classification, ...draft, editorial_origin: "generated_metadata_only", editorial_status: "pending_review", editorial_review_status: "pending" });
    revalidatePath("/editorial"); return { ok: true, draft };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "No se pudo guardar el borrador." }; }
}
