-- Rollback : Order snapshot B2B/B2G client
DROP INDEX IF EXISTS "Order_customerType_paidAt_idx";
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_customerCompanyVatNumber_format_check";
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_customerCompanySiret_format_check";
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_customerCompanySiren_format_check";
ALTER TABLE "Order"
    DROP COLUMN IF EXISTS "customerCompanyVatNumber",
    DROP COLUMN IF EXISTS "customerCompanySiret",
    DROP COLUMN IF EXISTS "customerCompanySiren",
    DROP COLUMN IF EXISTS "customerCompanyName",
    DROP COLUMN IF EXISTS "customerType";
