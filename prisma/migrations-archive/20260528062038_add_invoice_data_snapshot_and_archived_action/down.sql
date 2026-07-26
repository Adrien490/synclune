-- Rollback : snapshot InvoiceData + archivage + INVOICE_ARCHIVED
--
-- ⚠️ Postgres ne supporte PAS le DROP VALUE sur un enum. Le rollback complet
-- requiert un workaround (recréer le type, migrer les rows, DROP/RENAME).
-- Inclus ci-dessous mais ne PAS appliquer en prod sans backup PITR.

-- 1. Drop CHECK constraints
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_invoiceDataSnapshot_hash_coherence_check";
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_invoiceDataHash_format_check";

-- 2. Drop index
DROP INDEX IF EXISTS "Order_invoiceStatus_invoicePdfUrl_idx";

-- 3. Drop columns
ALTER TABLE "Order"
    DROP COLUMN IF EXISTS "invoiceArchivedAt",
    DROP COLUMN IF EXISTS "invoiceDataHash",
    DROP COLUMN IF EXISTS "invoiceDataSnapshot";

-- 4. Reverse OrderAction enum (workaround : recréer le type sans INVOICE_ARCHIVED)
--    Nécessite que AUCUNE row OrderHistory.action ne soit 'INVOICE_ARCHIVED'
--    avant rollback. Faire un UPDATE préalable si besoin.
ALTER TYPE "OrderAction" RENAME TO "OrderAction_old";
CREATE TYPE "OrderAction" AS ENUM (
    'CREATED',
    'PAID',
    'PROCESSING',
    'SHIPPED',
    'DELIVERED',
    'CANCELLED',
    'RETURNED',
    'STATUS_REVERTED',
    'TRACKING_UPDATED',
    'ADDRESS_UPDATED',
    'INVOICE_GENERATED',
    'REFUND_CREATED',
    'REFUND_COMPLETED',
    'REFUND_FAILED',
    'DISPUTE_OPENED',
    'DISPUTE_RESOLVED',
    'INVOICE_VOIDED'
);
ALTER TABLE "OrderHistory" ALTER COLUMN "action" TYPE "OrderAction"
    USING "action"::text::"OrderAction";
DROP TYPE "OrderAction_old";
