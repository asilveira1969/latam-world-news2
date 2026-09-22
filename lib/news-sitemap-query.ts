export function newsSitemapArticlesPath(page: number, pageSize: number): string {
  return `/articles?news_sitemap=1&page=${page}&pageSize=${pageSize}`;
}
