import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { fetchRssFeed } from "../lib/rss/fetch-rss";
import { parseRss } from "../lib/rss/parse-rss";
import { normalizeRssItems } from "../lib/rss/normalize";
import { extractOgImage } from "../lib/rss/extract-og-image";
import { isValidHttpUrl } from "../lib/images";
import { getEnabledMundoRssSources } from "../lib/sources";

loadEnv({ path: ".env.local" });
loadEnv();

function mapRssArticleToRow(
  article: ReturnType<typeof normalizeRssItems>[number],
  language: "es"
) {
  return {
    url: article.source_url,
    title: article.title,
    summary: article.excerpt,
    image_url: article.image_url,
    published_at: article.published_at,
    source: article.source_name,
    source_type: "rss",
    country: null as string | null,
    language,
    raw: {
      imported_via: "scripts/ingest-rss.ts",
      rss: true
    },
    source_url: article.source_url,
    source_name: article.source_name,
    excerpt: article.excerpt,
    content: article.content,
    slug: article.slug,
    region: article.region,
    category: article.category,
    tags: article.tags,
    is_featured: article.is_featured,
    is_impact: article.is_impact,
    views: article.views
  };
}

async function run() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  const feedSources = getEnabledMundoRssSources();
  if (feedSources.length === 0) {
    throw new Error("No enabled Mundo RSS sources found.");
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false }
  });

  let upserted = 0;

  for (const source of feedSources) {
    try {
      const xml = await fetchRssFeed(source.feedUrl);
      const items = parseRss(xml).slice(0, 25);
      const normalized = normalizeRssItems(items, source);
      const dedupedBySourceUrl = new Map<string, (typeof normalized)[number]>();

      for (const article of normalized) {
        dedupedBySourceUrl.set(article.source_url, article);
      }
      const uniqueArticles = [...dedupedBySourceUrl.values()];

      for (const article of uniqueArticles) {
        if (!article.image_url) {
          // TODO: Improve retry/timeout strategy when production scheduler is added.
          const ogImage = await extractOgImage(article.source_url);
          article.image_url = ogImage && isValidHttpUrl(ogImage)
            ? ogImage
            : "https://picsum.photos/seed/rss-fallback/1200/675";
        }
      }

      const rows = uniqueArticles.map((article) => mapRssArticleToRow(article, source.language));

      const { error } = await supabase.from("articles").upsert(rows, {
        onConflict: "source_url"
      });

      if (error) {
        console.error(`Feed failed: ${source.name}`, error.message);
        continue;
      }
      upserted += uniqueArticles.length;
    } catch (error) {
      console.error(`Feed failed: ${source.name}`, error);
    }
  }

  console.log(`RSS ingestion completed. Upserted rows (attempted): ${upserted}`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
