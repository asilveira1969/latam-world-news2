import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

type SeedArticle = {
  title: string;
  slug: string;
  excerpt: string;
  content?: string | null;
  image_url: string;
  source_name: string;
  source_url: string;
  region: string;
  category: string;
  tags: string[];
  published_at: string;
  is_featured?: boolean;
  is_impact?: boolean;
  views?: number;
};

async function run() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  const seedPath = path.join(process.cwd(), "data", "seed", "articles.json");
  const raw = await readFile(seedPath, "utf8");
  const seedArticles = JSON.parse(raw) as SeedArticle[];

  const rows = seedArticles.map((item) => ({
    title: item.title,
    slug: item.slug,
    excerpt: item.excerpt,
    content: item.content ?? null,
    image_url: item.image_url,
    source_name: item.source_name,
    source_url: item.source_url,
    region: item.region,
    category: item.category,
    tags: item.tags,
    published_at: item.published_at,
    is_featured: Boolean(item.is_featured),
    is_impact: Boolean(item.is_impact),
    views: Number(item.views ?? 0)
  }));

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false }
  });

  const { error } = await supabase.from("articles").upsert(rows, { onConflict: "slug" });

  if (error) {
    throw new Error(error.message);
  }

  console.log(`Seed completed with ${rows.length} records.`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
