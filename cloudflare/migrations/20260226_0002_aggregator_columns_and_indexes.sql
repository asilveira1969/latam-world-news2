-- PostgreSQL jsonb becomes JSON serialized as TEXT in D1.
ALTER TABLE articles ADD COLUMN url TEXT;
ALTER TABLE articles ADD COLUMN summary TEXT;
ALTER TABLE articles ADD COLUMN source TEXT;
ALTER TABLE articles ADD COLUMN source_type TEXT;
ALTER TABLE articles ADD COLUMN country TEXT;
ALTER TABLE articles ADD COLUMN language TEXT;
ALTER TABLE articles ADD COLUMN raw TEXT;

UPDATE articles
SET
  url = COALESCE(url, source_url),
  summary = COALESCE(summary, excerpt),
  source = COALESCE(source, source_name),
  source_type = COALESCE(source_type, 'api')
WHERE url IS NULL OR summary IS NULL OR source IS NULL OR source_type IS NULL;

-- SQLite cannot add a NOT NULL constraint to an existing column without rebuilding
-- the table. The Worker validates url on writes; this unique index preserves conflict behavior.
CREATE UNIQUE INDEX IF NOT EXISTS idx_articles_url_unique ON articles(url);
CREATE INDEX IF NOT EXISTS idx_articles_country ON articles(country);
CREATE INDEX IF NOT EXISTS idx_articles_source ON articles(source);
