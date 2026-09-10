/**
 * These are Supabase service namespaces, not public site sections. Keep this
 * list deliberately small: unknown paths must continue through normal Next.js
 * routing and receive its usual 404 response.
 */
const LEGACY_SUPABASE_NAMESPACE = /^\/(?:auth|functions|realtime|rest|storage)\/v1(?:\/|$)/i;

export function isLegacySupabasePath(pathname: string): boolean {
  return LEGACY_SUPABASE_NAMESPACE.test(pathname);
}

export const CRAWL_SITEMAPS = ["/sitemap.xml", "/sitemap-news.xml"] as const;
