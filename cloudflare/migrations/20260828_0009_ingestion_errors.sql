-- D1-only operational log for the new ingestion pipeline. It contains no source
-- payload or credentials, only safe metadata needed to diagnose failed runs.
CREATE TABLE IF NOT EXISTS ingestion_errors (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  message TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  context TEXT
);

CREATE INDEX IF NOT EXISTS idx_ingestion_errors_occurred_at
  ON ingestion_errors(occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_ingestion_errors_source_id
  ON ingestion_errors(source_id);
