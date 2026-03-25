import { NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/ingest/execute";
import {
  insertImpactoEditorialDraft,
  listImpactoSourceArticles,
  markImpactoDraftEmailed
} from "@/lib/data/impacto-drafts-repo";
import { generateImpactoEditorialDraft } from "@/lib/impacto-editorial-agent";
import { sendImpactoReviewEmail } from "@/lib/impacto-review-email";

export const dynamic = "force-dynamic";

async function handleGenerate(request: Request) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? 10);
  const hoursBack = Number(url.searchParams.get("hours") ?? 30);
  const shouldSendEmail = url.searchParams.get("send_email") === "1";

  const sourceArticles = await listImpactoSourceArticles({
    limit: Number.isFinite(limit) && limit > 0 ? limit : 10,
    hoursBack: Number.isFinite(hoursBack) && hoursBack > 0 ? hoursBack : 30
  });

  if (sourceArticles.length < 4) {
    return NextResponse.json(
      { ok: false, error: "Not enough recent RSS articles to generate an Impacto draft." },
      { status: 400 }
    );
  }

  const generated = await generateImpactoEditorialDraft(sourceArticles);
  const draft = await insertImpactoEditorialDraft({
    slug: generated.slug,
    title: generated.title,
    excerpt: generated.excerpt,
    seo_title: generated.seo_title ?? generated.title,
    seo_description: generated.seo_description ?? generated.excerpt,
    editorial_context: generated.editorial_context ?? "",
    editorial_sections: generated.editorial_sections,
    tags: generated.tags,
    countries: generated.countries ?? [],
    source_articles: sourceArticles,
    model: generated.model
  });

  if (shouldSendEmail) {
    const delivery = await sendImpactoReviewEmail(draft);
    await markImpactoDraftEmailed({
      id: draft.id,
      reviewEmail: delivery.reviewEmail,
      emailSentAt: delivery.sentAt,
      emailProvider: delivery.provider,
      emailMessageId: delivery.messageId
    });
  }

  return NextResponse.json({
    ok: true,
    draft_id: draft.id,
    slug: draft.slug,
    title: draft.title,
    source_count: draft.source_count,
    emailed: shouldSendEmail
  });
}

export async function GET(request: Request) {
  return handleGenerate(request);
}

export async function POST(request: Request) {
  return handleGenerate(request);
}
