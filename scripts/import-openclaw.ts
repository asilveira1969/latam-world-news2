import { config as loadEnv } from "dotenv";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";
import {
  cleanExcerpt,
  cleanPlainText,
  looksCorruptedText,
  looksLikeSystemError
} from "../lib/text/clean";
import { isValidHttpUrl } from "../lib/images";

loadEnv({ path: ".env.local" });
loadEnv();

type RegionValue = "Mundo" | "LatAm" | "EE.UU." | "Europa" | "Asia" | "Medio Oriente";

type OpenClawNewsItem = {
  title?: unknown;
  source_url?: unknown;
  source_name?: unknown;
  excerpt?: unknown;
  published_at?: unknown;
  region?: unknown;
  category?: unknown;
  tags?: unknown;
  image_url?: unknown;
  [key: string]: unknown;
};

type OpenClawIngestFile = {
  generated_at?: unknown;
  agent_id?: unknown;
  source_batch?: unknown;
  items?: unknown;
  data?: unknown;
  result?: unknown;
  content?: unknown;
};

type ArticleRow = {
  title: string;
  slug: string;
  excerpt: string;
  content: string | null;
  image_url: string;
  source_name: string;
  source_url: string;
  region: RegionValue;
  category: string;
  tags: string[];
  published_at: string;
  is_featured: boolean;
  is_impact: boolean;
  views: number;
};

export type OpenClawCliArgs = {
  file: string;
  dryRun: boolean;
  reportJson: boolean;
};

export type OpenClawImportReport = {
  ok: boolean;
  mode: "validate" | "import";
  file: string;
  raw_items: number;
  valid_items: number;
  rejected_items: number;
  fallback_published_at_used: number;
  errors_preview: string[];
  imported: boolean;
};

const DEFAULT_INPUT_PATH = path.join(process.cwd(), "openclaw", "ingested", "latest.json");
const IMAGE_FALLBACK = "https://picsum.photos/seed/openclaw-fallback/1200/675";
const BLOCKED_SOURCE_NAMES = new Set(["openclaw system"]);

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function hash4(input: string): string {
  return createHash("sha1").update(input).digest("hex").slice(0, 4);
}

export function parseArgs(argv: string[]): OpenClawCliArgs {
  let file = DEFAULT_INPUT_PATH;
  let dryRun = false;
  let reportJson = false;

  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--file") {
      file = argv[i + 1] ? path.resolve(argv[i + 1]) : file;
      i += 1;
      continue;
    }
    if (argv[i] === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (argv[i] === "--report-json") {
      reportJson = true;
    }
  }

  return { file, dryRun, reportJson };
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function maybeFixMojibake(value: string): string {
  if (!/[ÃƒÃ‚Ã¢â‚¬ï¿½Ã¢â‚¬â€œÃ¢â‚¬â„¢â”œâ”¬]/.test(value)) {
    return value;
  }

  try {
    const repaired = Buffer.from(value, "latin1").toString("utf8");
    const beforeScore = (value.match(/[ÃƒÃ‚Ã¢â‚¬ï¿½Ã¢â‚¬â€œÃ¢â‚¬â„¢â”œâ”¬]/g) ?? []).length;
    const afterScore = (repaired.match(/[ÃƒÃ‚Ã¢â‚¬ï¿½Ã¢â‚¬â€œÃ¢â‚¬â„¢â”œâ”¬]/g) ?? []).length;
    return afterScore < beforeScore ? repaired : value;
  } catch {
    return value;
  }
}

function asCleanString(value: unknown): string | null {
  const str = asNonEmptyString(value);
  if (!str) {
    return null;
  }
  const repaired = maybeFixMojibake(str);
  const cleaned = cleanPlainText(repaired);
  return cleaned || null;
}

function isValidUrl(value: string): boolean {
  return isValidHttpUrl(value);
}

function normalizeRegion(value: unknown): RegionValue {
  const raw = (typeof value === "string" ? maybeFixMojibake(value) : "").trim().toLowerCase();
  if (!raw) return "Mundo";

  const normalized = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (
    normalized === "latam" ||
    normalized === "latinoamerica" ||
    normalized === "america latina" ||
    normalized === "latin america"
  ) {
    return "LatAm";
  }
  if (
    normalized === "usa" ||
    normalized === "us" ||
    normalized === "united states" ||
    normalized === "eeuu"
  ) {
    return "EE.UU.";
  }
  if (normalized === "europa" || normalized === "europe") {
    return "Europa";
  }
  if (normalized === "asia") {
    return "Asia";
  }
  if (normalized === "medio oriente" || normalized === "middle east") {
    return "Medio Oriente";
  }
  if (
    normalized === "mundo" ||
    normalized === "world" ||
    normalized === "internacional" ||
    normalized === "international"
  ) {
    return "Mundo";
  }
  return "Mundo";
}

function normalizeCategory(value: unknown): string {
  const category = asCleanString(value);
  return category ?? "Geopolitica";
}

function toTagsArray(value: unknown): string[] {
  const rawList = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];

  const seen = new Set<string>();
  const tags: string[] = [];

  for (const item of rawList) {
    const normalized = maybeFixMojibake(String(item ?? ""))
      .trim()
      .toLowerCase();
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    tags.push(normalized);
  }

  return tags;
}

function normalizePublishedAt(value: unknown): { iso: string; fallbackUsed: boolean } {
  const candidate = asNonEmptyString(value);
  if (!candidate) {
    return { iso: new Date().toISOString(), fallbackUsed: true };
  }

  const date = new Date(candidate);
  if (Number.isNaN(date.getTime())) {
    return { iso: new Date().toISOString(), fallbackUsed: true };
  }
  return { iso: date.toISOString(), fallbackUsed: false };
}

function buildSlug(title: string, sourceUrl: string): string {
  const base = slugify(title) || "noticia";
  return `${base}-${hash4(sourceUrl)}`;
}

function buildExcerpt(title: string, sourceName: string, excerpt: unknown): string {
  const candidateRaw = asNonEmptyString(excerpt);
  const candidate = candidateRaw ? cleanExcerpt(maybeFixMojibake(candidateRaw), 280) : null;
  if (candidate) {
    return candidate;
  }
  return `${title} (${sourceName}).`.slice(0, 280);
}

function shouldRejectRow(row: ArticleRow): string | null {
  const sourceName = row.source_name.trim().toLowerCase();
  const combined = `${row.title}\n${row.excerpt}\n${row.category}\n${row.source_name}`;

  if (BLOCKED_SOURCE_NAMES.has(sourceName)) {
    return "Blocked source_name";
  }
  if (looksLikeSystemError(combined)) {
    return "System/config error content";
  }
  if (looksCorruptedText(`${row.title}\n${row.excerpt}`)) {
    return "Corrupted text encoding";
  }
  if (row.title.length < 12) {
    return "Title too short";
  }
  if (row.excerpt.length < 20) {
    return "Excerpt too short";
  }
  if (!isValidUrl(row.image_url) && looksLikeSystemError(`${row.title} ${row.excerpt}`)) {
    return "Invalid image + suspicious content";
  }
  return null;
}

function parsePotentialJsonText(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function extractItemsFromUnknown(payload: unknown): OpenClawNewsItem[] {
  if (Array.isArray(payload)) {
    return payload as OpenClawNewsItem[];
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const root = payload as OpenClawIngestFile;

  if (Array.isArray(root.items)) {
    return root.items as OpenClawNewsItem[];
  }

  const payloads = (root.result as { payloads?: Array<{ text?: unknown }> } | undefined)?.payloads;
  if (Array.isArray(payloads)) {
    for (const payloadEntry of payloads) {
      if (typeof payloadEntry?.text !== "string") {
        continue;
      }
      const nested = parsePotentialJsonText(payloadEntry.text);
      const nestedItems = extractItemsFromUnknown(nested);
      if (nestedItems.length > 0) {
        return nestedItems;
      }
    }
  }

  const wrappers = [root.result, root.data, root.content];
  for (const wrapped of wrappers) {
    if (Array.isArray(wrapped)) {
      return wrapped as OpenClawNewsItem[];
    }
    if (wrapped && typeof wrapped === "object" && Array.isArray((wrapped as { items?: unknown }).items)) {
      return (wrapped as { items: OpenClawNewsItem[] }).items;
    }
    if (typeof wrapped === "string") {
      const nested = parsePotentialJsonText(wrapped);
      const nestedItems = extractItemsFromUnknown(nested);
      if (nestedItems.length > 0) {
        return nestedItems;
      }
    }
  }

  return [];
}

function scoreItemCompleteness(row: Pick<ArticleRow, "excerpt" | "image_url" | "tags">): number {
  let score = 0;
  if (row.excerpt.length > 24) score += 2;
  if (row.image_url !== IMAGE_FALLBACK) score += 1;
  if (row.tags.length > 0) score += 1;
  return score;
}

function mapItemToArticle(item: OpenClawNewsItem): {
  row?: ArticleRow;
  error?: string;
  fallbackDateUsed?: boolean;
} {
  const title = asCleanString(item.title);
  if (!title) {
    return { error: "Missing title" };
  }

  const sourceUrl = asNonEmptyString(item.source_url);
  if (!sourceUrl || !isValidUrl(sourceUrl)) {
    return { error: "Missing or invalid source_url" };
  }

  const sourceName = asCleanString(item.source_name) ?? new URL(sourceUrl).hostname;
  const imageUrl = asNonEmptyString(item.image_url);
  const published = normalizePublishedAt(item.published_at);

  const row: ArticleRow = {
    title,
    slug: buildSlug(title, sourceUrl),
    excerpt: buildExcerpt(title, sourceName, item.excerpt),
    content: null,
    image_url: imageUrl && isValidUrl(imageUrl) ? imageUrl : IMAGE_FALLBACK,
    source_name: sourceName,
    source_url: sourceUrl,
    region: normalizeRegion(item.region),
    category: normalizeCategory(item.category),
    tags: toTagsArray(item.tags),
    published_at: published.iso,
    is_featured: false,
    is_impact: false,
    views: 0
  };

  const rejectionReason = shouldRejectRow(row);
  if (rejectionReason) {
    return { error: rejectionReason };
  }

  return { row, fallbackDateUsed: published.fallbackUsed };
}

async function readJsonFileWithBom(file: string): Promise<unknown> {
  const rawFile = await readFile(file);
  let raw: string;

  if (rawFile.length >= 2 && rawFile[0] === 0xff && rawFile[1] === 0xfe) {
    raw = rawFile.toString("utf16le");
  } else if (rawFile.length >= 2 && rawFile[0] === 0xfe && rawFile[1] === 0xff) {
    const swapped = Buffer.from(rawFile);
    for (let i = 0; i + 1 < swapped.length; i += 2) {
      const tmp = swapped[i];
      swapped[i] = swapped[i + 1];
      swapped[i + 1] = tmp;
    }
    raw = swapped.toString("utf16le");
  } else {
    raw = rawFile.toString("utf8");
  }

  raw = raw.replace(/^\uFEFF/, "").trimStart();
  return JSON.parse(raw) as unknown;
}

function buildReport(params: {
  mode: "validate" | "import";
  file: string;
  rawItems: number;
  validItems: number;
  rejectedItems: number;
  fallbackDateCount: number;
  errors: string[];
  imported: boolean;
}): OpenClawImportReport {
  return {
    ok: params.validItems > 0,
    mode: params.mode,
    file: path.relative(process.cwd(), params.file) || params.file,
    raw_items: params.rawItems,
    valid_items: params.validItems,
    rejected_items: params.rejectedItems,
    fallback_published_at_used: params.fallbackDateCount,
    errors_preview: params.errors.slice(0, 10),
    imported: params.imported
  };
}

function printReport(report: OpenClawImportReport, reportJson: boolean) {
  if (reportJson) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  const modeLabel = report.mode === "validate" ? "OpenClaw validation" : "OpenClaw import";
  console.log(`${modeLabel} completed for ${report.file}`);
  console.log(`Raw items: ${report.raw_items}`);
  console.log(`Valid items: ${report.valid_items}`);
  console.log(`Rejected items: ${report.rejected_items}`);
  console.log(`Fallback published_at used: ${report.fallback_published_at_used}`);

  if (report.errors_preview.length > 0) {
    console.warn("Rejected item summary (first 10):");
    report.errors_preview.forEach((msg) => console.warn(`- ${msg}`));
  }
}

export async function runOpenClawImportCli(
  argv: string[],
  options?: { forceDryRun?: boolean }
): Promise<number> {
  const parsed = parseArgs(argv);
  const dryRun = options?.forceDryRun ? true : parsed.dryRun;
  const mode = dryRun ? "validate" : "import";

  const payload = await readJsonFileWithBom(parsed.file);
  const items = extractItemsFromUnknown(payload);

  if (!Array.isArray(items)) {
    throw new Error("Invalid OpenClaw payload: expected an items array.");
  }

  const errors: string[] = [];
  let fallbackDateCount = 0;
  const deduped = new Map<string, ArticleRow>();

  for (const [index, item] of items.entries()) {
    const mapped = mapItemToArticle(item);
    if (!mapped.row) {
      errors.push(`Item ${index + 1}: ${mapped.error ?? "Unknown error"}`);
      continue;
    }
    if (mapped.fallbackDateUsed) {
      fallbackDateCount += 1;
    }

    const existing = deduped.get(mapped.row.source_url);
    if (!existing || scoreItemCompleteness(mapped.row) > scoreItemCompleteness(existing)) {
      deduped.set(mapped.row.source_url, mapped.row);
    }
  }

  const rows = [...deduped.values()];
  let imported = false;

  if (rows.length > 0 && !dryRun) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceRoleKey) {
      throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    }

    const supabase = createClient(url, serviceRoleKey, {
      auth: { persistSession: false }
    });

    const { error } = await supabase.from("articles").upsert(rows, {
      onConflict: "source_url"
    });

    if (error) {
      throw new Error(error.message);
    }
    imported = true;
  }

  const report = buildReport({
    mode,
    file: parsed.file,
    rawItems: items.length,
    validItems: rows.length,
    rejectedItems: errors.length,
    fallbackDateCount,
    errors,
    imported
  });

  printReport(report, parsed.reportJson);
  return rows.length > 0 ? 0 : 2;
}

const isMain = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  runOpenClawImportCli(process.argv.slice(2))
    .then((code) => {
      process.exit(code);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
