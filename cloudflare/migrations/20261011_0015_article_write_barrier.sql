-- Transaction-scoped capabilities. The Worker deletes them before db.batch commits.
CREATE TABLE article_write_permissions (
  operation_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('write', 'reject', 'expire')),
  article_id TEXT NOT NULL,
  source_url TEXT NOT NULL,
  url TEXT NOT NULL,
  url_hash TEXT,
  old_source_url TEXT,
  old_url TEXT,
  old_hash TEXT,
  cutoff TEXT,
  PRIMARY KEY (operation_id, article_id, kind)
);

DROP TRIGGER articles_rejected_url_insert;
DROP TRIGGER articles_rejected_url_update;

CREATE TRIGGER articles_barrier_insert BEFORE INSERT ON articles
BEGIN
  SELECT RAISE(ABORT, 'Article write permission required')
  WHERE NEW.source_url_hash IS NULL OR length(NEW.source_url_hash) != 64
    OR NEW.source_url_hash GLOB '*[^0-9a-f]*'
    OR NOT EXISTS (SELECT 1 FROM article_write_permissions p
      WHERE p.kind = 'write' AND p.article_id = NEW.id
        AND p.source_url = NEW.source_url AND p.url = NEW.url
        AND p.url_hash = NEW.source_url_hash);
  SELECT RAISE(IGNORE) WHERE EXISTS (
    SELECT 1 FROM rejected_article_urls WHERE url_hash = NEW.source_url_hash);
END;

CREATE TRIGGER articles_barrier_update
BEFORE UPDATE OF id, source_url, url, source_url_hash ON articles
WHEN NEW.id IS NOT OLD.id OR NEW.source_url IS NOT OLD.source_url
  OR NEW.url IS NOT OLD.url OR NEW.source_url_hash IS NOT OLD.source_url_hash
BEGIN
  SELECT RAISE(ABORT, 'Article link permission required')
  WHERE NEW.id IS NOT OLD.id OR NEW.source_url_hash IS NULL
    OR length(NEW.source_url_hash) != 64 OR NEW.source_url_hash GLOB '*[^0-9a-f]*'
    OR NOT EXISTS (SELECT 1 FROM article_write_permissions p
      WHERE p.kind = 'write' AND p.article_id = NEW.id
        AND p.source_url = NEW.source_url AND p.url = NEW.url
        AND p.url_hash = NEW.source_url_hash
        AND p.old_source_url IS OLD.source_url AND p.old_url IS OLD.url
        AND p.old_hash IS OLD.source_url_hash);
  SELECT RAISE(ABORT, 'Rejected source URL') WHERE EXISTS (
    SELECT 1 FROM rejected_article_urls WHERE url_hash = NEW.source_url_hash);
END;

CREATE TRIGGER articles_barrier_delete BEFORE DELETE ON articles
BEGIN
  SELECT RAISE(ABORT, 'Article deletion permission required')
  WHERE NOT EXISTS (SELECT 1 FROM article_write_permissions p
    WHERE p.article_id = OLD.id AND p.source_url = OLD.source_url AND p.url = OLD.url
      AND OLD.editorial_status = 'pending_review' AND OLD.editorial_review_status = 'pending'
      AND ((p.kind = 'reject' AND EXISTS (
        SELECT 1 FROM rejected_article_urls r WHERE r.url_hash = p.url_hash))
        OR (p.kind = 'expire' AND p.cutoff IS NOT NULL AND OLD.created_at < p.cutoff)));
END;
