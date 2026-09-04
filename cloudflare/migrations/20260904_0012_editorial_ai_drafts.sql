-- Optional editorial-draft fields. Safe for historical articles: all are nullable.
ALTER TABLE articles ADD COLUMN editorial_format TEXT
  CHECK (editorial_format IS NULL OR editorial_format IN ('brief', 'context', 'latam_impact'));
ALTER TABLE articles ADD COLUMN editorial_key_takeaway TEXT;
ALTER TABLE articles ADD COLUMN editorial_what_to_watch TEXT;
ALTER TABLE articles ADD COLUMN editorial_latam_impact TEXT;
ALTER TABLE articles ADD COLUMN editorial_author TEXT;
ALTER TABLE articles ADD COLUMN editorial_updated_at TEXT;

CREATE INDEX IF NOT EXISTS idx_articles_editorial_format_review
  ON articles(editorial_format, editorial_review_status, published_at DESC);
