"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { applyD1EditorialDecisions, getD1InternalArticleBySlug } from "@/lib/d1/internal-client";
import { classifyD1EditorialInput } from "@/lib/d1/editorial/classify";
import { endEditorialSession, requireEditorialSession, startEditorialSession } from "@/lib/editorial-dashboard/auth";

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
