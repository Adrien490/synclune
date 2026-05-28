-- Rollback : archivage XML structure
DROP INDEX IF EXISTS "Order_invoiceXmlArchivedAt_idx";
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_invoiceXmlHash_format_check";
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_invoiceXmlFormat_check";
ALTER TABLE "Order"
    DROP COLUMN IF EXISTS "invoiceXmlArchivedAt",
    DROP COLUMN IF EXISTS "invoiceXmlFormat",
    DROP COLUMN IF EXISTS "invoiceXmlHash",
    DROP COLUMN IF EXISTS "invoiceXmlUrl";
