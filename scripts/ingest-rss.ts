import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { fetchRssFeed } from "../lib/rss/fetch-rss";
import { parseRss } from "../lib/rss/parse-rss";
import { normalizeRssItems } from "../lib/rss/normalize";
import { extractOgImage } from "../lib/rss/extract-og-image";

async function run() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  const feedUrls = (process.env.RSS_FEEDS ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (feedUrls.length === 0) {
    throw new Error("RSS_FEEDS is empty.");
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false }
  });

  let upserted = 0;

  for (const feedUrl of feedUrls) {
    const xml = await fetchRssFeed(feedUrl);
    const items = parseRss(xml).slice(0, 25);
    const sourceName = new URL(feedUrl).hostname;
    const normalized = normalizeRssItems(items, sourceName);

    for (const article of normalized) {
      if (!article.image_url) {
        // TODO: Improve retry/timeout strategy when production scheduler is added.
        const ogImage = await extractOgImage(article.source_url);
        article.image_url = ogImage ?? "https://picsum.photos/seed/rss-fallback/1200/675";
      }
    }

    const { error } = await supabase.from("articles").upsert(normalized, {
      onConflict: "source_url"
    });

    if (error) {
      console.error(`Feed failed: ${feedUrl}`, error.message);
      continue;
    }
    upserted += normalized.length;
  }

  console.log(`RSS ingestion completed. Upserted rows (attempted): ${upserted}`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
