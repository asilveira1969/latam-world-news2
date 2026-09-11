import assert from "node:assert/strict";
import { CRAWL_SITEMAPS, isLegacyServicePath } from "../lib/crawl-policy";
import { isEligibleForNewsSitemap } from "../lib/news-sitemap-policy";

for (const pathname of [
  "/rest/v1/articles",
  "/auth/v1/token",
  "/storage/v1/object/public/images/example.jpg",
  "/functions/v1/ingest",
  "/realtime/v1/websocket"
]) {
  assert.equal(isLegacyServicePath(pathname), true, `${pathname} should be retired with 410`);
}

for (const pathname of [
  "/",
  "/nota/current-article",
  "/impacto/editorial/current-analysis",
  "/articles/legacy-slug",
  "/rest/articles"
]) {
  assert.equal(isLegacyServicePath(pathname), false, `${pathname} must retain normal routing`);
}

assert.deepEqual(CRAWL_SITEMAPS, ["/sitemap.xml", "/sitemap-news.xml"]);

const now = new Date("2026-09-10T12:00:00.000Z");
const approved = {
  editorial_status: "ready",
  editorial_review_status: "approved",
  editorial_reviewed_at: "2026-09-10T11:55:00.000Z"
};

assert.equal(
  isEligibleForNewsSitemap({ ...approved, published_at: "2026-09-09T12:01:00.000Z" }, now),
  true,
  "recently published, approved news belongs in the News sitemap"
);
assert.equal(
  isEligibleForNewsSitemap({ ...approved, published_at: "2026-09-08T11:59:59.000Z" }, now),
  false,
  "News sitemap must not retain articles older than 48 hours"
);
assert.equal(
  isEligibleForNewsSitemap({ ...approved, published_at: undefined }, now),
  false,
  "a News sitemap entry requires a valid publication date"
);
assert.equal(
  isEligibleForNewsSitemap({ ...approved, editorial_review_status: "pending", published_at: "2026-09-10T11:00:00.000Z" }, now),
  false,
  "unapproved articles must never be exposed in the News sitemap"
);
console.log("SEO crawl policy checks passed.");
