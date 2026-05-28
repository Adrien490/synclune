-- Rollback : OrderItem hsCode + unitCode
ALTER TABLE "OrderItem" DROP CONSTRAINT IF EXISTS "OrderItem_unitCode_check";
ALTER TABLE "OrderItem" DROP CONSTRAINT IF EXISTS "OrderItem_hsCode_check";
ALTER TABLE "OrderItem"
    DROP COLUMN IF EXISTS "unitCode",
    DROP COLUMN IF EXISTS "hsCode";
