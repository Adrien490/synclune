-- Add indexes used by the monthly hard-delete-retention cron.
--
-- Both queries scan soft-deleted rows older than 10 years (legal retention).
-- Without these indexes the queries fall back to sequential scan as the
-- soft-deleted history grows.
--
-- Production note: prefer to apply these in a maintenance window with
-- `CREATE INDEX CONCURRENTLY` (CREATE INDEX without CONCURRENTLY locks the
-- table for writes). Prisma migrate does not support CONCURRENTLY natively;
-- if that matters, run the SQL by hand in prod and `prisma migrate resolve
-- --applied 20260510192826_add_indexes_for_hard_delete_retention_cron`.

-- Product: hard-delete-retention.service.ts filters
--   WHERE deletedAt < retentionDate AND status = 'ARCHIVED'
CREATE INDEX "Product_status_deletedAt_idx" ON "Product"("status", "deletedAt");

-- ProductReview: hard-delete-retention.service.ts filters
--   WHERE deletedAt < retentionDate (without productId/status)
CREATE INDEX "ProductReview_deletedAt_idx" ON "ProductReview"("deletedAt");
