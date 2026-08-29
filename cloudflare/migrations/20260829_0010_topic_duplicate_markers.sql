-- Non-blocking editorial markers for likely cross-source coverage of the same event.
-- They never enforce uniqueness and do not remove any source article.
ALTER TABLE articles ADD COLUMN possible_topic_duplicate INTEGER NOT NULL DEFAULT 0
  CHECK (possible_topic_duplicate IN (0, 1));
ALTER TABLE articles ADD COLUMN topic_duplicate_group TEXT;
ALTER TABLE articles ADD COLUMN topic_duplicate_confidence REAL;
ALTER TABLE articles ADD COLUMN topic_duplicate_of_slug TEXT;

CREATE INDEX IF NOT EXISTS idx_articles_topic_duplicate_group
  ON articles(topic_duplicate_group, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_possible_topic_duplicate
  ON articles(possible_topic_duplicate, published_at DESC);
