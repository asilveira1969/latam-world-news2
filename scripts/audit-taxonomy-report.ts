import fs from "node:fs";
import path from "node:path";
import { getPrimaryTopicSlug, normalizeCountry, validateTopicAssignment } from "@/lib/hubs";

type AuditArticle = {
  slug: string;
  title: string;
  excerpt: string;
  content?: string | null;
  source_name?: string | null;
  region: string;
  country?: string | null;
  category: string;
  tags: string[];
  topic_slug?: string | null;
  section_slug?: string | null;
};

function readJson<T>(relativePath: string): T {
  const fullPath = path.join(process.cwd(), relativePath);
  return JSON.parse(fs.readFileSync(fullPath, "utf8")) as T;
}

function summarizeArticles(articles: AuditArticle[]) {
  const topicCounts = new Map<string, number>();
  const rows: Array<{
    slug: string;
    topic: string;
    country: string | null;
    fallback: boolean;
    issues: string[];
  }> = [];

  for (const article of articles) {
    const topic = getPrimaryTopicSlug({
      topic: article.topic_slug ?? null,
      tags: article.tags,
      category: article.category,
      title: article.title,
      excerpt: article.excerpt,
      content: article.content ?? null,
      sourceName: article.source_name ?? null
    });
    const issues = validateTopicAssignment({
      topicSlug: topic,
      tags: article.tags,
      category: article.category,
      title: article.title,
      excerpt: article.excerpt,
      content: article.content ?? null,
      sourceName: article.source_name ?? null
    });
    const fallback = topic === "internacional";

    topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1);
    rows.push({
      slug: article.slug,
      topic,
      country: normalizeCountry(article.country ?? null),
      fallback,
      issues
    });
  }

  const withTopicIssues = rows.filter((row) => row.issues.length > 0);
  const withoutCountry = rows.filter((row) => !row.country);
  const fallbackTopics = rows.filter((row) => row.fallback);

  return {
    total: rows.length,
    withoutCountry: withoutCountry.length,
    fallbackTopics: fallbackTopics.length,
    topicIssues: withTopicIssues.length,
    topicBreakdown: [...topicCounts.entries()].sort((a, b) => b[1] - a[1]),
    issueSamples: withTopicIssues.slice(0, 10),
    fallbackSamples: fallbackTopics.slice(0, 10)
  };
}

const manual = readJson<AuditArticle[]>("data/manual-articles.json");
const seed = readJson<AuditArticle[]>("data/seed/articles.json");
const summary = summarizeArticles([...manual, ...seed]);

console.log(JSON.stringify(summary, null, 2));
