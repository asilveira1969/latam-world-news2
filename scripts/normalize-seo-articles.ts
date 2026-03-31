import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { generateEditorialWithAgent } from "@/lib/editorial-agent-enrichment";
import { getArticleDisplayMeta } from "@/lib/editorial/article-display";
import { getPrimaryTopicSlug, normalizeCountry, validateTopicAssignment } from "@/lib/hubs";
import { mapRecordToArticle } from "@/lib/data/articles-repo";
import { deriveSectionSlug } from "@/lib/article-taxonomy";

loadEnv({ path: ".env.local" });
loadEnv();

const BATCH_SIZE = 100;

function parseLimit(argv: string[]): number | null {
  const raw = argv.find((arg) => arg.startsWith("--limit="));
  if (!raw) {
    return null;
  }

  const parsed = Number(raw.split("=")[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseOffset(argv: string[]): number {
  const raw = argv.find((arg) => arg.startsWith("--offset="));
  if (!raw) {
    return 0;
  }

  const parsed = Number(raw.split("=")[1]);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function hasFlag(argv: string[], flag: string): boolean {
  return argv.includes(flag);
}

async function fetchAllRows(limit: number | null, offsetStart: number) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing Supabase service credentials.");
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const rows: Record<string, unknown>[] = [];
  let offset = offsetStart;
  let remaining = limit;

  while (true) {
    const upperBound = remaining ? Math.min(offset + BATCH_SIZE - 1, offset + remaining - 1) : offset + BATCH_SIZE - 1;
    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .order("published_at", { ascending: false })
      .range(offset, upperBound);

    if (error) {
      throw new Error(`Failed to fetch articles: ${error.message}`);
    }

    const batch = (data ?? []) as Record<string, unknown>[];
    if (batch.length === 0) {
      break;
    }

    rows.push(...batch);

    if (remaining !== null) {
      remaining -= batch.length;
    }

    if (batch.length < BATCH_SIZE || (remaining !== null && remaining <= 0)) {
      break;
    }

    offset += BATCH_SIZE;
  }

  return { supabase, rows: limit ? rows.slice(0, limit) : rows };
}

async function main() {
  const argv = process.argv.slice(2);
  const limit = parseLimit(argv);
  const offset = parseOffset(argv);
  const dryRun = hasFlag(argv, "--dry-run");
  const { supabase, rows } = await fetchAllRows(limit, offset);

  let updated = 0;
  let unchanged = 0;
  let failed = 0;

  for (const row of rows) {
    const article = mapRecordToArticle(row);
    const displayMeta = getArticleDisplayMeta(article);
    const normalizedCountry =
      normalizeCountry(article.country) ??
      displayMeta.countrySlug ??
      normalizeCountry(article.region) ??
      null;
    const topicSlug =
      getPrimaryTopicSlug({
        topic: article.topic_slug,
        tags: article.tags,
        category: article.category,
        title: article.title,
        excerpt: article.excerpt,
        content: article.content,
        sourceName: article.source_name
      }) ?? null;
    const sectionSlug = article.section_slug ?? deriveSectionSlug(article);
    const needsEditorial =
      !article.latamworldnews_summary?.trim() || !article.curated_news?.trim();

    const nextTags =
      topicSlug && !article.tags.includes(topicSlug)
        ? [...new Set([...article.tags, topicSlug])]
        : article.tags;

    const updatePayload: Record<string, unknown> = {};

    if ((row.country ?? null) !== normalizedCountry) {
      updatePayload.country = normalizedCountry;
    }
    if ((row.topic_slug ?? null) !== topicSlug) {
      updatePayload.topic_slug = topicSlug;
    }
    if ((row.section_slug ?? null) !== sectionSlug) {
      updatePayload.section_slug = sectionSlug;
    }
    if (JSON.stringify(row.tags ?? []) !== JSON.stringify(nextTags)) {
      updatePayload.tags = nextTags;
    }
    const taxonomyIssues = validateTopicAssignment({
      topicSlug,
      tags: nextTags,
      category: article.category,
      title: article.title,
      excerpt: article.excerpt,
      content: article.content,
      sourceName: article.source_name
    });
    if (taxonomyIssues.length > 0) {
      console.warn(`TOPIC REVIEW ${article.slug}: ${taxonomyIssues.join(",")}`);
    }

    if (needsEditorial) {
      try {
        const generated = await generateEditorialWithAgent({
          title: article.title,
          excerpt: article.excerpt,
          content: article.content,
          source_name: article.source_name,
          source_url: article.source_url,
          region: article.region,
          category: article.category,
          tags: nextTags,
          published_at: article.published_at
        });

        updatePayload.content = generated.source_content ?? article.content;
        updatePayload.latamworldnews_summary = generated.latamworldnews_summary;
        updatePayload.curated_news = generated.curated_news;
        updatePayload.editorial_status = "ready";
        updatePayload.editorial_generated_at = new Date().toISOString();
        updatePayload.editorial_model = generated.model;
      } catch (error) {
        failed += 1;
        const message = error instanceof Error ? error.message : String(error);
        console.error(`FAILED ${article.slug}: ${message}`);
        continue;
      }
    }

    if (Object.keys(updatePayload).length === 0) {
      unchanged += 1;
      continue;
    }

    if (!dryRun) {
      const { error } = await supabase.from("articles").update(updatePayload).eq("id", article.id);
      if (error) {
        failed += 1;
        console.error(`FAILED ${article.slug}: ${error.message}`);
        continue;
      }
    }

    updated += 1;
    console.log(`${dryRun ? "DRY" : "UPDATED"} ${article.slug}`);
  }

  console.log(
    JSON.stringify(
      {
        processed: rows.length,
        offset,
        updated,
        unchanged,
        failed,
        dryRun
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
