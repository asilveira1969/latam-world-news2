import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });
loadEnv();

function hasApplyFlag(argv: string[]): boolean {
  return argv.includes("--apply");
}

function parseLimit(argv: string[]): number {
  const raw = argv.find((arg) => arg.startsWith("--limit="));
  const parsed = raw ? Number(raw.split("=")[1]) : 20;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 20;
}

function parseUrlPattern(argv: string[]): string {
  const raw = argv.find((arg) => arg.startsWith("--pattern="));
  const parsed = raw ? raw.split("=")[1]?.trim() : "";
  return parsed || "elpais.com/escaparate/";
}

async function main() {
  const { getSupabaseServiceClient, hasSupabaseServiceEnv } = await import("../lib/supabase/server");

  if (!hasSupabaseServiceEnv) {
    throw new Error("Supabase service credentials are missing.");
  }

  const apply = hasApplyFlag(process.argv.slice(2));
  const limit = parseLimit(process.argv.slice(2));
  const urlPattern = parseUrlPattern(process.argv.slice(2)).toLowerCase();
  const supabase = getSupabaseServiceClient();

  const { data, error } = await supabase
    .from("articles")
    .select("id, slug, title, source_name, source_url, published_at", { count: "exact" })
    .eq("source_type", "rss")
    .ilike("source_url", `%${urlPattern}%`)
    .order("published_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load RSS articles for pattern ${urlPattern}: ${error.message}`);
  }

  const rows = data ?? [];
  const preview = rows.slice(0, limit);

  console.log(
    JSON.stringify(
      {
        mode: apply ? "apply" : "dry-run",
        pattern: urlPattern,
        matches: rows.length,
        preview: preview.map((row) => ({
          id: row.id,
          slug: row.slug,
          title: row.title,
          source_name: row.source_name,
          source_url: row.source_url,
          published_at: row.published_at
        }))
      },
      null,
      2
    )
  );

  if (!apply || rows.length === 0) {
    return;
  }

  const ids = rows.map((row) => row.id);
  const { error: deleteError, count } = await supabase
    .from("articles")
    .delete({ count: "exact" })
    .in("id", ids);

  if (deleteError) {
    throw new Error(`Failed to delete RSS articles for pattern ${urlPattern}: ${deleteError.message}`);
  }

  console.log(
    JSON.stringify(
      {
        deleted: count ?? ids.length
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
