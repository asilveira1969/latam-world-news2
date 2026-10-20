-- Match public state predicates and the complete deterministic cursor order.
-- Prepared locally only; applying this index remotely requires deployment approval.
CREATE INDEX IF NOT EXISTS idx_articles_public_seek
ON articles(editorial_review_status, editorial_status, published_at DESC, id DESC);
