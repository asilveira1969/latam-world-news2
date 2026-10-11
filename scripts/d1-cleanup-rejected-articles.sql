-- RETIRED after migration 0015: direct deletion omits the rejection reference
-- and is intentionally forbidden by articles_barrier_delete.
-- Current editorial rejections use /internal/articles/delete-batch on pending
-- articles: hash reference + content deletion + permission cleanup in one batch.
-- Historical rejected rows require a separately authorized data reconciliation;
-- this file must not delete or reclassify them.
SELECT COUNT(*) AS historical_rejected_rows FROM articles
WHERE editorial_status = 'rejected' OR editorial_review_status = 'rejected';
