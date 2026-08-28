ALTER TABLE articles ADD COLUMN countries TEXT NOT NULL DEFAULT '[]';
ALTER TABLE articles ADD COLUMN impact_format TEXT;
ALTER TABLE articles ADD COLUMN editorial_sections TEXT;
ALTER TABLE articles ADD COLUMN latam_angle TEXT;
ALTER TABLE articles ADD COLUMN faq_items TEXT;
ALTER TABLE articles ADD COLUMN seo_title TEXT;
ALTER TABLE articles ADD COLUMN seo_description TEXT;

CREATE INDEX IF NOT EXISTS idx_articles_impact_format ON articles(impact_format);
