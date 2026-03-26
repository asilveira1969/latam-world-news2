import { NextResponse } from "next/server";
import { generateEditorialWithAgent } from "@/lib/editorial-agent-enrichment";
import { isCronAuthorized } from "@/lib/ingest/execute";
import { getSupabaseServiceClient, hasSupabaseServiceEnv } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!hasSupabaseServiceEnv) {
    return NextResponse.json({ ok: false, error: "Missing Supabase service credentials." }, { status: 500 });
  }

  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("articles")
    .select("id, slug, title, excerpt, content, source_name, source_url, region, category, tags, published_at")
    .eq("source_type", "rss")
    .or("editorial_status.is.null,editorial_status.eq.pending,editorial_status.eq.failed")
    .order("published_at", { ascending: false })
    .limit(10);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  let ready = 0;
  let failed = 0;
  for (const row of data ?? []) {
    try {
      const result = await generateEditorialWithAgent({
        ...row,
        tags: Array.isArray(row.tags) ? row.tags : []
      });

      const { error: updateError } = await supabase
        .from("articles")
        .update({
          content: result.source_content ?? row.content,
          latamworldnews_summary: result.latamworldnews_summary,
          curated_news: result.curated_news,
          editorial_status: "ready",
          editorial_generated_at: new Date().toISOString(),
          editorial_model: result.model
        })
        .eq("id", row.id);

      if (updateError) {
        throw new Error(updateError.message);
      }
      ready += 1;
    } catch {
      failed += 1;
      await supabase.from("articles").update({ editorial_status: "failed" }).eq("id", row.id);
    }
  }

  return NextResponse.json({
    ok: true,
    processed: (data ?? []).length,
    ready,
    failed
  });
}
