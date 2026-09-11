/**
 * These are retired legacy service namespaces, not public site sections. Keep this
 * list deliberately small: unknown paths must continue through normal Next.js
 * routing and receive its usual 404 response.
 */
const LEGACY_SERVICE_NAMESPACE = /^\/(?:auth|functions|realtime|rest|storage)\/v1(?:\/|$)/i;

export function isLegacyServicePath(pathname: string): boolean {
  return LEGACY_SERVICE_NAMESPACE.test(pathname);
}

export const CRAWL_SITEMAPS = ["/sitemap.xml", "/sitemap-news.xml"] as const;
