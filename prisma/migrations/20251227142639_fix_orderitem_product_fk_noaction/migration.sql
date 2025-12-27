-- AlterForeignKey: Change OrderItem.productId from SetNull to NoAction
-- This preserves sales history for bestseller calculations when products are archived

-- Drop the existing constraint
ALTER TABLE "OrderItem" DROP CONSTRAINT IF EXISTS "OrderItem_productId_fkey";

-- Add the new constraint with NO ACTION
ALTER TABLE "OrderItem"
  ADD CONSTRAINT "OrderItem_productId_fkey"
  FOREIGN KEY ("productId")
  REFERENCES "Product"("id")
  ON DELETE NO ACTION
  ON UPDATE CASCADE;
