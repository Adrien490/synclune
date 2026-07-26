-- Rollback: cycle VOIDED facture + avoir
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_creditNoteNumber_format_check";
DROP INDEX IF EXISTS "Order_creditNoteNumber_key";
ALTER TABLE "Order"
    DROP COLUMN IF EXISTS "creditNoteGeneratedAt",
    DROP COLUMN IF EXISTS "creditNoteNumber",
    DROP COLUMN IF EXISTS "invoiceVoidedAt";
