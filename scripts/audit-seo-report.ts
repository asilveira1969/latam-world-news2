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

function articleType(article: AuditArticle): string {
  return article.impact_format || (article.is_impact ? "analysis" : "note");
}

function printExamples(title: string, rows: string[]) {
  console.log(`\n${title}: ${rows.length}`);
  rows.slice(0, 6).forEach((row) => console.log(`- ${row}`));
}

const manual = readJson<AuditArticle[]>("data/manual-articles.json");
const seed = readJson<AuditArticle[]>("data/seed/articles.json");
const all = [...manual, ...seed];

const stats = new Map<string, number>();
const longTitles: string[] = [];
const shortTitles: string[] = [];
const genericNoteDescriptions: string[] = [];
const genericAnalysisTitles: string[] = [];
const manualOverrides: string[] = [];

for (const article of all) {
  const editorial = getEditorialBlocks(article as never);
  const type = articleType(article);
  const titleLength = editorial.seoTitle.length;
  const descLength = editorial.seoDescription.length;

  stats.set(`type:${type}`, (stats.get(`type:${type}`) ?? 0) + 1);
  if (article.seo_title || article.seo_description) {
    manualOverrides.push(`${article.slug} [${type}]`);
  }
  if (titleLength > 85) {
    longTitles.push(`${article.slug} [${type}] (${titleLength}) -> ${editorial.seoTitle}`);
  }
  if (titleLength < 45) {
    shortTitles.push(`${article.slug} [${type}] (${titleLength}) -> ${editorial.seoTitle}`);
  }
  if (
    type === "note" &&
    (editorial.seoDescription.includes("Lectura editorial para America Latina") ||
      editorial.seoDescription.includes("Seguimiento de "))
  ) {
    genericNoteDescriptions.push(`${article.slug} (${descLength}) -> ${editorial.seoDescription}`);
  }
  if (type === "analysis" && /Analisis de impacto para LATAM/i.test(editorial.seoTitle)) {
    genericAnalysisTitles.push(`${article.slug} -> ${editorial.seoTitle}`);
  }
}

console.log(`TOTAL ARTICLES: ${all.length}`);
console.log("TYPE BREAKDOWN:");
for (const [key, value] of [...stats.entries()].sort()) {
  console.log(`- ${key.replace("type:", "")}: ${value}`);
}

printExamples("MANUAL OVERRIDES", manualOverrides);
printExamples("LONG SEO TITLES", longTitles);
printExamples("SHORT SEO TITLES", shortTitles);
printExamples("GENERIC NOTE DESCRIPTIONS", genericNoteDescriptions);
printExamples("GENERIC ANALYSIS TITLES", genericAnalysisTitles);
