-- Drop ghost Invoice columns and enum from Order table
-- These were created in the initial migration but removed from schema.prisma
-- without a corresponding DROP migration. The invoice feature will be
-- reimplemented later with a proper migration.

-- Validate no data exists in invoice columns before dropping
-- (safety check - these columns were never populated)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "Order"
    WHERE "invoiceNumber" IS NOT NULL
       OR "invoiceDate" IS NOT NULL
       OR "invoicePdfUrl" IS NOT NULL
       OR "invoiceIssuedAt" IS NOT NULL
    LIMIT 1
  ) THEN
    RAISE EXCEPTION 'Invoice columns contain data - aborting migration';
  END IF;
END $$;

-- Drop indexes first
DROP INDEX IF EXISTS "Order_invoiceNumber_key";
DROP INDEX IF EXISTS "Order_invoiceNumber_idx";
DROP INDEX IF EXISTS "Order_invoiceStatus_idx";
DROP INDEX IF EXISTS "Order_invoiceStatus_invoiceDate_idx";
DROP INDEX IF EXISTS "Order_userId_invoiceDate_idx";

-- Drop columns
ALTER TABLE "Order" DROP COLUMN IF EXISTS "invoiceNumber";
ALTER TABLE "Order" DROP COLUMN IF EXISTS "invoiceDate";
ALTER TABLE "Order" DROP COLUMN IF EXISTS "invoiceStatus";
ALTER TABLE "Order" DROP COLUMN IF EXISTS "invoicePdfUrl";
ALTER TABLE "Order" DROP COLUMN IF EXISTS "invoiceIssuedAt";

-- Drop enum
DROP TYPE IF EXISTS "InvoiceStatus";
