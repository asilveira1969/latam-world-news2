import fs from "node:fs";
import path from "node:path";
import { getEditorialBlocks } from "../lib/article-seo";

type AuditArticle = {
  slug: string;
  title: string;
  excerpt: string;
  region: string;
  category: string;
  tags: string[];
  countries?: string[] | null;
  impact_format?: string | null;
  is_impact: boolean;
  seo_title?: string | null;
  seo_description?: string | null;
};

function readJson<T>(relativePath: string): T {
  const fullPath = path.join(process.cwd(), relativePath);
  return JSON.parse(fs.readFileSync(fullPath, "utf8")) as T;
}

const manual = readJson<AuditArticle[]>("data/manual-articles.json");
const seed = readJson<AuditArticle[]>("data/seed/articles.json");
const sample = [...manual.slice(0, 7), ...seed.slice(0, 5)];

for (const article of sample) {
  const editorial = getEditorialBlocks(article as never);
  console.log("---");
  console.log(article.slug);
  console.log(`TYPE: ${article.impact_format || (article.is_impact ? "analysis" : "note")}`);
  console.log(`TITLE: ${article.title}`);
  console.log(`SEO TITLE: ${editorial.seoTitle}`);
  console.log(`SEO DESC: ${editorial.seoDescription}`);
}
