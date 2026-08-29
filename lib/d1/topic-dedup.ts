import { createHash } from "node:crypto";

const TOPIC_DUPLICATE_WINDOW_MS = 48 * 60 * 60 * 1000;
const MIN_SHARED_TERMS = 4;
const MIN_JACCARD_SIMILARITY = 0.65;
const MIN_TOKEN_COVERAGE = 0.75;
const STOP_WORDS = new Set([
  "a", "al", "ante", "con", "contra", "como", "desde", "del", "el", "en", "es", "la", "las",
  "lo", "los", "para", "por", "que", "se", "sin", "sobre", "tras", "un", "una", "unos", "unas",
  "y", "ya", "su", "sus", "the", "and", "of", "to", "in", "on", "for", "with"
]);

export interface TopicDuplicateCandidate {
  slug: string;
  title: string;
  source_name: string;
  source_url: string;
  published_at: string;
}

export interface TopicDuplicateMatch {
  matchedSlug: string;
  group: string;
  confidence: number;
  sharedTerms: string[];
}

function normalizedTerms(title: string): string[] {
  return [...new Set(
    title
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .split(" ")
      .filter((term) => term.length >= 3 && !STOP_WORDS.has(term))
  )];
}

function dateValue(value: string): number | null {
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

export function dedupeBySourceUrl<T extends { source_url: string }>(items: T[]): {
  unique: T[];
  skipped: number;
} {
  const seen = new Set<string>();
  const unique: T[] = [];
  let skipped = 0;

  for (const item of items) {
    if (!item.source_url || seen.has(item.source_url)) {
      skipped += 1;
      continue;
    }
    seen.add(item.source_url);
    unique.push(item);
  }

  return { unique, skipped };
}

export function findPossibleTopicDuplicate(
  candidate: TopicDuplicateCandidate,
  existing: TopicDuplicateCandidate[]
): TopicDuplicateMatch | null {
  const candidateTime = dateValue(candidate.published_at);
  const candidateTerms = normalizedTerms(candidate.title);
  if (!candidateTime || candidateTerms.length < MIN_SHARED_TERMS) return null;

  const candidateSet = new Set(candidateTerms);
  let best: TopicDuplicateMatch | null = null;

  for (const item of existing) {
    if (item.source_url === candidate.source_url || item.source_name === candidate.source_name) continue;
    const itemTime = dateValue(item.published_at);
    if (!itemTime || Math.abs(candidateTime - itemTime) > TOPIC_DUPLICATE_WINDOW_MS) continue;

    const itemTerms = normalizedTerms(item.title);
    const sharedTerms = itemTerms.filter((term) => candidateSet.has(term));
    const unionSize = new Set([...candidateTerms, ...itemTerms]).size;
    const jaccard = sharedTerms.length / unionSize;
    const coverage = sharedTerms.length / Math.min(candidateTerms.length, itemTerms.length);

    if (
      sharedTerms.length < MIN_SHARED_TERMS ||
      jaccard < MIN_JACCARD_SIMILARITY ||
      coverage < MIN_TOKEN_COVERAGE
    ) {
      continue;
    }

    const confidence = Number(((jaccard + coverage) / 2).toFixed(3));
    if (!best || confidence > best.confidence) {
      const groupSeed = [candidate.slug, item.slug].sort().join(":");
      best = {
        matchedSlug: item.slug,
        group: `topic-${createHash("sha1").update(groupSeed).digest("hex").slice(0, 16)}`,
        confidence,
        sharedTerms
      };
    }
  }

  return best;
}

export const TOPIC_DUPLICATE_POLICY = {
  windowHours: 48,
  minSharedTerms: MIN_SHARED_TERMS,
  minJaccardSimilarity: MIN_JACCARD_SIMILARITY,
  minTokenCoverage: MIN_TOKEN_COVERAGE
} as const;
