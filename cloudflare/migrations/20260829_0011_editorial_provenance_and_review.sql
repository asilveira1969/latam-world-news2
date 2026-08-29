-- Provenance and human-review metadata for D1-only editorial enrichment.
-- Apply only after the Worker version with the editorial patch endpoint is deployed.
ALTER TABLE articles ADD COLUMN editorial_origin TEXT
  CHECK (editorial_origin IS NULL OR editorial_origin IN ('generated_metadata_only'));
ALTER TABLE articles ADD COLUMN editorial_input_hash TEXT;
ALTER TABLE articles ADD COLUMN editorial_prompt_version TEXT;
ALTER TABLE articles ADD COLUMN editorial_validation TEXT;
ALTER TABLE articles ADD COLUMN editorial_review_status TEXT NOT NULL DEFAULT 'not_requested'
  CHECK (editorial_review_status IN ('not_requested', 'pending', 'approved', 'rejected'));
ALTER TABLE articles ADD COLUMN editorial_reviewed_at TEXT;
ALTER TABLE articles ADD COLUMN editorial_review_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_articles_editorial_review
  ON articles(editorial_review_status, editorial_status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_editorial_input_hash
  ON articles(editorial_input_hash);
