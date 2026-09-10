# Production SEO and crawl audit — 2026-09-10

## Findings

- `robots.txt` advertised only `/sitemap.xml`; the dedicated Google News feed at
  `/sitemap-news.xml` was not advertised there.
- The primary sitemap was eligible to remain cached for an hour, while D1
  content and the Google News route operate on a five-minute cadence.
- Google News entries used the editorial approval time as `publication_date`.
  Google News requires the original publication time, and the 48-hour window
  should be measured from that same value.
- Home and section templates excluded otherwise valid articles whenever an
  upstream image was missing, repeated, or could not be attributed to the
  source. Those articles could appear in a sitemap without a normal internal
  link from their section or the homepage.
- Article pages emit canonical metadata and `NewsArticle` JSON-LD, but their
  JSON-LD `dateModified` skipped `published_at` when no editorial update was
  available.
- Current unknown routes render the Next.js 404 page. There was no redirect of
  unknown article URLs to the homepage.

## Implemented change

- Advertise both XML sitemaps in `robots.txt`.
- Refresh the primary sitemap every five minutes and opt it into dynamic
  rendering. D1 reads in this path now use the same five-minute fetch cache.
- Restrict Google News entries to approved records whose `published_at` is in
  the last 48 hours, and use `published_at` as `news:publication_date`.
- Keep valid articles in the homepage latest feed and section listings even
  without a qualified remote image; `NewsImage` supplies the fallback.
- Return `410 Gone` only for the exact same-origin Supabase service namespaces
  `/auth/v1`, `/functions/v1`, `/realtime/v1`, `/rest/v1`, and `/storage/v1`.
  The response has no redirect and includes `X-Robots-Tag: noindex, nofollow`.
  All article-like and unrecognized paths retain the normal 404 behavior.

## Important limitation

This application cannot change responses served by a separate
`*.supabase.co` hostname. If Search Console's 404 samples are on that external
hostname rather than `latamworldnews.com`, retire or configure that Supabase
project separately; do not map those requests to the site homepage.

## Post-release verification

1. Fetch `/robots.txt` and confirm it lists both sitemap URLs.
2. Fetch both sitemaps and sample several listed URLs for `200`, canonical URL,
   and matching `NewsArticle` publication date.
3. Check each listed D1 article has a link from its applicable homepage/section
   feed.
4. Request one path in each retired namespace and confirm `410`; request a
   made-up `/nota/...` URL and confirm `404` (not a redirect).
5. In Search Console, resubmit the two sitemaps and monitor Crawl Stats and
   Page Indexing for 2–4 weeks. Crawling cadence remains Google-controlled, so
   the change removes technical blockers but cannot guarantee a specific crawl
   delay.
