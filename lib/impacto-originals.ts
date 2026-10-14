import type { Article } from "./types/article";
import { isEligibleImpactOriginal, ORIGINAL_IMPACT_FORMATS, type OriginalImpactFormat } from "./manual-editorial";

export const IMPACT_ARCHIVE_PAGE_SIZE = 12;
// Small, fixed source pages are reusable across archive pages and homepage reads.
export const IMPACT_SOURCE_PAGE_SIZE = 16;
export type ImpactOriginalPageReader = (format: OriginalImpactFormat, page: number, pageSize: number) => Promise<Article[]>;

export function parseImpactArchivePage(value?: string | string[]): number {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) ? page : 1;
}

export function impactArchivePath(page: number): string {
  return page === 1 ? "/impacto" : `/impacto?pagina=${page}`;
}

export function compareImpactOriginals(a: Article, b: Article): number {
  return Date.parse(b.published_at) - Date.parse(a.published_at) ||
    (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0);
}

function originalStream(read: ImpactOriginalPageReader, format: OriginalImpactFormat, now: Date) {
  let page = 1;
  let exhausted = false;
  let buffer: Article[] = [];
  const seen = new Set<string>();
  async function fill() {
    if (page > 1_000_000) throw new Error("Impacto source pagination exhausted.");
    const rows = await read(format, page++, IMPACT_SOURCE_PAGE_SIZE);
    exhausted = rows.length < IMPACT_SOURCE_PAGE_SIZE;
    for (const article of rows) {
      if (article.impact_format === format && isEligibleImpactOriginal(article, now) && !seen.has(article.slug)) {
        seen.add(article.slug);
        buffer.push(article);
      }
    }
    buffer.sort(compareImpactOriginals);
  }
  return {
    async next(): Promise<Article | null> {
      while (!buffer.length && !exhausted) await fill();
      if (!buffer.length) return null;
      // The Worker orders by date only. Complete the leading date cohort before
      // sorting by slug, so a tie spanning source pages is stable across views.
      while (!exhausted && Date.parse(buffer[0].published_at) === Date.parse(buffer[buffer.length - 1].published_at)) {
        await fill();
      }
      return buffer.shift() ?? null;
    }
  };
}

export async function loadImpactOriginalCategory(read: ImpactOriginalPageReader, format: OriginalImpactFormat,
  limit: number, now = new Date()): Promise<Article[]> {
  const stream = originalStream(read, format, now);
  const items: Article[] = [];
  while (items.length < limit) {
    const next = await stream.next();
    if (!next) break;
    items.push(next);
  }
  return items;
}

export async function loadImpactOriginalArchive(read: ImpactOriginalPageReader, page = 1, now = new Date()) {
  const streams = ORIGINAL_IMPACT_FORMATS.map((format) => originalStream(read, format, now));
  const featured = await Promise.all(streams.map((stream) => stream.next()));
  const heads = await Promise.all(streams.map((stream) => stream.next()));
  const seen = new Set(featured.flatMap((article) => article ? [article.slug] : []));
  const offset = (page - 1) * IMPACT_ARCHIVE_PAGE_SIZE;
  const archive: Article[] = [];
  let position = 0;
  while (true) {
    let selected = -1;
    for (let i = 0; i < heads.length; i++) {
      if (heads[i] && (selected === -1 || compareImpactOriginals(heads[i]!, heads[selected]!) < 0)) selected = i;
    }
    if (selected === -1) break;
    const article = heads[selected]!;
    if (!seen.has(article.slug)) {
      seen.add(article.slug);
      if (position++ >= offset) archive.push(article);
      if (archive.length > IMPACT_ARCHIVE_PAGE_SIZE) break;
    }
    heads[selected] = await streams[selected].next();
  }
  return {
    featured: { editorial: featured[0], opinion: featured[1], columnist: featured[2] },
    archive: archive.slice(0, IMPACT_ARCHIVE_PAGE_SIZE),
    hasNext: archive.length > IMPACT_ARCHIVE_PAGE_SIZE,
    page
  };
}
