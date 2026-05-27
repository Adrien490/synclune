-- Rollback : OrderItem TVA par ligne
ALTER TABLE "OrderItem" DROP CONSTRAINT IF EXISTS "OrderItem_taxCategoryCode_check";
ALTER TABLE "OrderItem" DROP CONSTRAINT IF EXISTS "OrderItem_lineTotalIncludingTax_non_negative";
ALTER TABLE "OrderItem" DROP CONSTRAINT IF EXISTS "OrderItem_lineTotalExcludingTax_non_negative";
ALTER TABLE "OrderItem" DROP CONSTRAINT IF EXISTS "OrderItem_taxAmount_non_negative";
ALTER TABLE "OrderItem" DROP CONSTRAINT IF EXISTS "OrderItem_taxRate_non_negative";
ALTER TABLE "OrderItem"
    DROP COLUMN IF EXISTS "taxCategoryCode",
    DROP COLUMN IF EXISTS "lineTotalIncludingTax",
    DROP COLUMN IF EXISTS "lineTotalExcludingTax",
    DROP COLUMN IF EXISTS "taxAmount",
    DROP COLUMN IF EXISTS "taxRate";
