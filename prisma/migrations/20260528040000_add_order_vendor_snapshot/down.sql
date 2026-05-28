-- Rollback : Order snapshot vendeur + enum VatRegime
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_vendorVatNumber_format_check";
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_vendorSiret_format_check";
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_vendorSiren_format_check";

ALTER TABLE "Order"
    DROP COLUMN IF EXISTS "vendorLegalForm",
    DROP COLUMN IF EXISTS "vendorVatRegime",
    DROP COLUMN IF EXISTS "vendorVatNumber",
    DROP COLUMN IF EXISTS "vendorSiret",
    DROP COLUMN IF EXISTS "vendorSiren",
    DROP COLUMN IF EXISTS "vendorAddress",
    DROP COLUMN IF EXISTS "vendorTradeName",
    DROP COLUMN IF EXISTS "vendorLegalName";

DROP TYPE IF EXISTS "VatRegime";
