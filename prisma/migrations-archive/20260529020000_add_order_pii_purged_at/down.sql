-- Rollback : retrait du marqueur de purge PII à 10 ans.
DROP INDEX IF EXISTS "Order_piiPurgedAt_paidAt_idx";

ALTER TABLE "Order"
    DROP COLUMN IF EXISTS "piiPurgedAt";
