-- ONE-TIME MAINTENANCE ONLY. Do not run without explicit authorization.
-- This permanently removes every existing rejected article, with no audit trail.
DELETE FROM articles
WHERE editorial_status = 'rejected'
   OR editorial_review_status = 'rejected';
