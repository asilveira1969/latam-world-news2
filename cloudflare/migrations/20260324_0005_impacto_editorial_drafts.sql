CREATE TABLE IF NOT EXISTS impacto_editorial_drafts (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  seo_title TEXT,
  seo_description TEXT,
  editorial_context TEXT,
  editorial_sections TEXT NOT NULL,
  tags TEXT NOT NULL DEFAULT '[]',
  countries TEXT NOT NULL DEFAULT '[]',
  source_articles TEXT NOT NULL DEFAULT '[]',
  source_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending_review',
  review_email TEXT,
  email_sent_at TEXT,
  email_provider TEXT,
  email_message_id TEXT,
  model TEXT,
  generated_at TEXT NOT NULL,
  approved_at TEXT,
  published_article_slug TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_impacto_editorial_drafts_status ON impacto_editorial_drafts(status);
CREATE INDEX IF NOT EXISTS idx_impacto_editorial_drafts_generated_at ON impacto_editorial_drafts(generated_at DESC);
