export type NewsSitemapCandidate = {
  editorial_status?: string | null;
  editorial_review_status?: string | null;
  editorial_reviewed_at?: string | null;
  published_at?: string | null;
};

export function isEligibleForNewsSitemap(
  article: NewsSitemapCandidate,
  now = new Date()
): boolean {
  if (
    article.editorial_status !== "ready" ||
    article.editorial_review_status !== "approved" ||
    !article.editorial_reviewed_at
  ) {
    return false;
  }

  const publishedAt = Date.parse(article.published_at ?? "");
  const earliestPublication = now.getTime() - 48 * 60 * 60 * 1_000;
  return (
    Number.isFinite(publishedAt) &&
    publishedAt >= earliestPublication &&
    publishedAt <= now.getTime()
  );
}
