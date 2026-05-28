-- Rollback : DLQ retry + audit transmission PDP/PA

-- 6. ProviderWebhookEvent
DROP TABLE IF EXISTS "ProviderWebhookEvent";

-- 5. InvoiceTransmissionLog
DROP TABLE IF EXISTS "InvoiceTransmissionLog";

-- 4. User cache annuaire
ALTER TABLE "User"
    DROP CONSTRAINT IF EXISTS "User_directoryLastCheckedSiretSnapshot_format",
    DROP COLUMN IF EXISTS "directoryLastCheckedSiretSnapshot",
    DROP COLUMN IF EXISTS "directoryLastCheckedAt",
    DROP COLUMN IF EXISTS "customerEInvoicingAddress",
    DROP COLUMN IF EXISTS "customerEInvoicingPlatformId";

-- 3. Order indexes
DROP INDEX IF EXISTS "Order_pdpStatus_pdpTransmittedAt_idx";
DROP INDEX IF EXISTS "Order_pdpStatus_pdpLastRetryAt_idx";

-- 2. Order DLQ retry columns
ALTER TABLE "Order"
    DROP CONSTRAINT IF EXISTS "Order_pdpRetryCount_non_negative",
    DROP COLUMN IF EXISTS "pdpLastRetryAt",
    DROP COLUMN IF EXISTS "pdpRetryCount",
    DROP COLUMN IF EXISTS "pdpRejectionCode",
    DROP COLUMN IF EXISTS "pdpProviderName";

-- 1. Enums
DROP TYPE IF EXISTS "ProviderWebhookEventStatus";
DROP TYPE IF EXISTS "TransmissionLogStatus";
DROP TYPE IF EXISTS "TransmissionDirection";

-- Note : PostgreSQL ne supporte pas DROP VALUE sur un TYPE ENUM.
-- Pour retirer la valeur CANCELLED, il faudrait :
--   1. Recreer le type sans CANCELLED
--   2. Migrer toutes les colonnes utilisant l'ancien type
--   3. Drop l'ancien type
-- Solution alternative : laisser la valeur orpheline (aucune row ne l'utilise post-rollback).
-- ALTER TYPE "PdpTransmissionStatus" ADD VALUE 'CANCELLED' BEFORE 'ABANDONED' (non rollbackable directement)
