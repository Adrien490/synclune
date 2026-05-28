-- Rollback : retire Refund.attemptCount + index status_stripeRefundId
DROP INDEX IF EXISTS "Refund_status_stripeRefundId_idx";

ALTER TABLE "Refund" DROP COLUMN IF EXISTS "attemptCount";
