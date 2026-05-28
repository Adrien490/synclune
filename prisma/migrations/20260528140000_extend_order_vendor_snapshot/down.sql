-- Rollback : extension snapshot vendeur (email, APE, IBAN, BIC)
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_vendorBankBic_format_check";
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_vendorBankIban_format_check";
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_vendorApeCode_format_check";
ALTER TABLE "Order"
    DROP COLUMN IF EXISTS "vendorBankBic",
    DROP COLUMN IF EXISTS "vendorBankIban",
    DROP COLUMN IF EXISTS "vendorApeCode",
    DROP COLUMN IF EXISTS "vendorEmail";
