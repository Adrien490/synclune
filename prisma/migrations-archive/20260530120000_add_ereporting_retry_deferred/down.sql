-- Rollback EINV-EREPORT-009
DROP INDEX IF EXISTS "Refund_ereportingRetryDeferred_idx";
DROP INDEX IF EXISTS "Order_ereportingRetryDeferred_idx";
ALTER TABLE "Refund" DROP COLUMN IF EXISTS "ereportingRetryDeferred";
ALTER TABLE "Order" DROP COLUMN IF EXISTS "ereportingRetryDeferred";
