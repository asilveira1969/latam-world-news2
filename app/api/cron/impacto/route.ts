import { NextResponse } from "next/server";
import {
  insertImpactoEditorialDraft,
  listImpactoSourceArticles
} from "@/lib/data/impacto-drafts-repo";
import { isCronAuthorized } from "@/lib/ingest/execute";
import { generateImpactoEditorialDraft } from "@/lib/impacto-editorial-agent";
import { getSupabaseServiceClient, hasSupabaseServiceEnv } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function getMontevideoDayStartIso(now = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Montevideo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const parts = formatter.formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return new Date(`${year}-${month}-${day}T00:00:00-03:00`).toISOString();
}

async function handleCron(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!hasSupabaseServiceEnv) {
    return NextResponse.json({ ok: false, error: "Missing Supabase service credentials." }, { status: 500 });
  }

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? 10);
  const hoursBack = Number(url.searchParams.get("hours") ?? 30);
  const sourceLimit = Number.isFinite(limit) && limit > 0 ? limit : 10;
  const sourceHours = Number.isFinite(hoursBack) && hoursBack > 0 ? hoursBack : 30;

  const supabase = getSupabaseServiceClient();
  const dayStartIso = getMontevideoDayStartIso();
  const { data: existingDraft, error: existingError } = await supabase
    .from("impacto_editorial_drafts")
    .select("id, slug, title, status, generated_at")
    .gte("generated_at", dayStartIso)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ ok: false, error: existingError.message }, { status: 500 });
  }

  if (existingDraft) {
    return NextResponse.json({
      ok: true,
      existing: true,
      draft_id: existingDraft.id,
      slug: existingDraft.slug,
      title: existingDraft.title,
      status: existingDraft.status,
      generated_at: existingDraft.generated_at
    });
  }

  const sourceArticles = await listImpactoSourceArticles({
    limit: sourceLimit,
    hoursBack: sourceHours
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

  return NextResponse.json({
    ok: true,
    existing: false,
    draft_id: draft.id,
    slug: draft.slug,
    title: draft.title,
    source_count: draft.source_count,
    generated_at: draft.generated_at
  });
}

export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}
