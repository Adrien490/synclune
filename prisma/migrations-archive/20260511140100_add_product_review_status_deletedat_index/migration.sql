-- =====================================================================
-- Add index ProductReview(status, deletedAt) for admin global counts
-- =====================================================================
-- Audit reviews 2026-05-11 P2.4 :
-- `getReviewCountsByStatus` (admin dashboard) fait un groupBy global sur
-- (status, deletedAt) sans productId. L'index existant
-- (productId, status, deletedAt) n'est pas utilisé car productId est absent
-- du predicate. Index dédié pour scan séquentiel rapide.
-- =====================================================================

CREATE INDEX IF NOT EXISTS "ProductReview_status_deletedAt_idx"
  ON "ProductReview" ("status", "deletedAt");
