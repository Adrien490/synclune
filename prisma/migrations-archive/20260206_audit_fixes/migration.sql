-- Audit fixes migration
-- C2: OrderNote.orderId - Cascade -> SetNull (preserve notes if order deleted)
-- C2: RefundItem.refundId - Cascade -> SetNull (preserve details if refund deleted)
-- C3: Remove standalone boolean indexes (low cardinality, sequential scan preferred)
-- C4: OrderItem.productId - NoAction -> SetNull (defensive)
-- D3: DiscountUsage.deletedAt index - add discountId for stats queries

-- ============================================================================
-- C2: OrderNote -> Order : Cascade -> SetNull, make orderId nullable
-- ============================================================================

-- Drop existing FK constraint
ALTER TABLE "OrderNote" DROP CONSTRAINT IF EXISTS "OrderNote_orderId_fkey";

-- Make orderId nullable
ALTER TABLE "OrderNote" ALTER COLUMN "orderId" DROP NOT NULL;

-- Re-add FK with SetNull
ALTER TABLE "OrderNote"
  ADD CONSTRAINT "OrderNote_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- C2: RefundItem -> Refund : Cascade -> SetNull, make refundId nullable
-- ============================================================================

-- Drop existing FK constraint
ALTER TABLE "RefundItem" DROP CONSTRAINT IF EXISTS "RefundItem_refundId_fkey";

-- Make refundId nullable
ALTER TABLE "RefundItem" ALTER COLUMN "refundId" DROP NOT NULL;

-- Re-add FK with SetNull
ALTER TABLE "RefundItem"
  ADD CONSTRAINT "RefundItem_refundId_fkey"
  FOREIGN KEY ("refundId") REFERENCES "Refund"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- C3: Remove standalone boolean indexes (PostgreSQL best practice)
-- ============================================================================

DROP INDEX IF EXISTS "ProductType_isActive_idx";
DROP INDEX IF EXISTS "Color_isActive_idx";
DROP INDEX IF EXISTS "Material_isActive_idx";

-- ============================================================================
-- C4: OrderItem.productId : NoAction -> SetNull (more defensive)
-- ============================================================================

ALTER TABLE "OrderItem" DROP CONSTRAINT IF EXISTS "OrderItem_productId_fkey";

ALTER TABLE "OrderItem"
  ADD CONSTRAINT "OrderItem_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- D3: DiscountUsage.deletedAt index improvement
-- ============================================================================

-- Drop old simple index
DROP INDEX IF EXISTS "DiscountUsage_deletedAt_idx";

-- Create composite index for stats queries
CREATE INDEX "DiscountUsage_deletedAt_discountId_idx" ON "DiscountUsage"("deletedAt", "discountId");
