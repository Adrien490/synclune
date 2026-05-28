-- Rollback : Order routing PDP
ALTER TABLE "Order"
    DROP COLUMN IF EXISTS "customerServiceCode",
    DROP COLUMN IF EXISTS "customerPublicEntityCode",
    DROP COLUMN IF EXISTS "customerEInvoicingAddress",
    DROP COLUMN IF EXISTS "customerEInvoicingPlatformId",
    DROP COLUMN IF EXISTS "vendorEInvoicingAddress",
    DROP COLUMN IF EXISTS "vendorEInvoicingPlatformId";
