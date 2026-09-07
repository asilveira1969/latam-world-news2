-- Supports daily removal and same-day listing of pending editorial inbox items.
CREATE INDEX IF NOT EXISTS idx_articles_pending_created_at
  ON articles(editorial_status, editorial_review_status, created_at);
