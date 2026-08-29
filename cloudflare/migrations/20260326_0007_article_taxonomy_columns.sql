ALTER TABLE articles ADD COLUMN topic_slug TEXT;
ALTER TABLE articles ADD COLUMN section_slug TEXT;

CREATE INDEX IF NOT EXISTS idx_articles_topic_slug ON articles(topic_slug);
CREATE INDEX IF NOT EXISTS idx_articles_section_slug ON articles(section_slug);
