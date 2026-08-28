-- source_url is already NOT NULL and UNIQUE from the initial D1 schema.
-- The expanded region CHECK is also included there because SQLite cannot alter CHECK
-- constraints in place without a table rebuild.
CREATE INDEX IF NOT EXISTS idx_articles_source_url ON articles(source_url);
CREATE INDEX IF NOT EXISTS idx_articles_region_language ON articles(region, language);
CREATE INDEX IF NOT EXISTS idx_articles_published_region ON articles(published_at DESC, region);
