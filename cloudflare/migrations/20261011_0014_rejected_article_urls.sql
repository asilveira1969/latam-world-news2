-- Minimal, permanent rejection references. Expiration never inserts here.
CREATE TABLE rejected_article_urls (url_hash TEXT PRIMARY KEY NOT NULL);
ALTER TABLE articles ADD COLUMN source_url_hash TEXT;
CREATE TRIGGER articles_rejected_url_insert
BEFORE INSERT ON articles
WHEN EXISTS (SELECT 1 FROM rejected_article_urls WHERE url_hash = NEW.source_url_hash)
BEGIN SELECT RAISE(IGNORE); END;
CREATE TRIGGER articles_rejected_url_update
BEFORE UPDATE OF source_url_hash ON articles
WHEN EXISTS (SELECT 1 FROM rejected_article_urls WHERE url_hash = NEW.source_url_hash)
BEGIN SELECT RAISE(ABORT, 'Rejected source URL'); END;
