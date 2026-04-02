import { config as loadEnv } from "dotenv";
import { loadPendingRssEditorialRows } from "../lib/rss/editorial-queue";

loadEnv({ path: ".env.local" });
loadEnv();

function parseLimit(argv: string[]): number {
  const raw = argv.find((arg) => arg.startsWith("--limit="));
  const parsed = raw ? Number(raw.split("=")[1]) : 10;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 10;
}

async function main() {
  const { generateEditorialWithAgent } = await import("../lib/editorial-agent-enrichment");
  const { getSupabaseServiceClient, hasSupabaseServiceEnv } = await import("../lib/supabase/server");
  if (!hasSupabaseServiceEnv) {
    throw new Error("Supabase service credentials are missing.");
  }

  const supabase = getSupabaseServiceClient();
  const limit = parseLimit(process.argv.slice(2));
  const rows = await loadPendingRssEditorialRows(supabase, {
    totalLimit: limit,
    perSourceLimit: Math.min(8, limit)
  });
  if (rows.length === 0) {
    console.log("No RSS articles pending editorial enrichment.");
    return;
  }

  let ready = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      const result = await generateEditorialWithAgent({
        ...row,
        tags: row.tags ?? []
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
      console.log(`READY ${row.slug}`);
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      await supabase.from("articles").update({ editorial_status: "failed" }).eq("id", row.id);
      console.error(`FAILED ${row.slug}: ${message}`);
    }
  }

  console.log(JSON.stringify({ processed: rows.length, ready, failed }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
