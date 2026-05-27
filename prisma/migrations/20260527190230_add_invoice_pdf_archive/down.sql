-- Rollback: archivage immuable PDF facture
ALTER TABLE "Order"
    DROP COLUMN IF EXISTS "invoicePdfHash",
    DROP COLUMN IF EXISTS "invoicePdfUrl";
