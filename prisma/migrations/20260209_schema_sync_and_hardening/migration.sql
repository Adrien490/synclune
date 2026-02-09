-- Schema sync and hardening migration
-- Syncs schema.prisma with DB state and adds production hardening fixes

-- ============================================================================
-- Fix 1: ProductSku NULLS NOT DISTINCT (PostgreSQL 15+)
-- Prevents duplicate variants when colorId/size/materialId are NULL
-- ============================================================================

-- Validate no existing duplicate variants
DO $$
BEGIN
  IF EXISTS (
    SELECT "productId", "colorId", "size", "materialId", COUNT(*)
    FROM "ProductSku"
    GROUP BY "productId", "colorId", "size", "materialId"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate ProductSku variants detected - fix data before migrating';
  END IF;
END $$;

DROP INDEX IF EXISTS "ProductSku_productId_colorId_size_materialId_key";
CREATE UNIQUE INDEX "ProductSku_productId_colorId_size_materialId_key"
  ON "ProductSku"("productId", "colorId", "size", "materialId")
  NULLS NOT DISTINCT;

-- ============================================================================
-- Fix 2: DiscountUsage unique constraint on (discountId, orderId)
-- Prevents duplicate discount usage on the same order at DB level
-- ============================================================================

CREATE UNIQUE INDEX "DiscountUsage_discountId_orderId_key"
  ON "DiscountUsage"("discountId", "orderId");

-- ============================================================================
-- Fix 3: Order.stripeChargeId unique constraint
-- Each Stripe Charge ID is globally unique
-- ============================================================================

CREATE UNIQUE INDEX "Order_stripeChargeId_key" ON "Order"("stripeChargeId");

-- ============================================================================
-- Fix 5: Remove redundant @default(now()) on updatedAt fields
-- @updatedAt already handles initial value in Prisma
-- ============================================================================

ALTER TABLE "User" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "Verification" ALTER COLUMN "updatedAt" DROP DEFAULT;
