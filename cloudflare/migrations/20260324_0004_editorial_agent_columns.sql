ALTER TABLE articles ADD COLUMN latamworldnews_summary TEXT;
ALTER TABLE articles ADD COLUMN curated_news TEXT;
ALTER TABLE articles ADD COLUMN editorial_status TEXT;
ALTER TABLE articles ADD COLUMN editorial_generated_at TEXT;
ALTER TABLE articles ADD COLUMN editorial_model TEXT;

UPDATE articles
SET editorial_status = COALESCE(editorial_status, 'pending')
WHERE source_type = 'rss'
  AND (latamworldnews_summary IS NULL OR curated_news IS NULL);

CREATE INDEX IF NOT EXISTS idx_articles_editorial_status ON articles(editorial_status);
CREATE INDEX IF NOT EXISTS idx_articles_source_type_editorial_status ON articles(source_type, editorial_status);
