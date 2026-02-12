-- Schema audit v2 migration
-- Fixes from comprehensive Prisma schema audit (Feb 2026)
-- Covers: C1 (ShippingCarrier), I1-I4, M1-M5

-- ============================================================================
-- C1. Convert ShippingCarrier from enum to VARCHAR(30) with lowercase values
-- The Prisma enum was desynchronized from application code (5 UPPERCASE values
-- vs 11 lowercase values in Zod schema). Switching to String lets Zod be the
-- single source of truth for carrier validation.
-- ============================================================================

-- Step 1: Add temporary column
ALTER TABLE "Order" ADD COLUMN "shippingCarrier_new" VARCHAR(30);

-- Step 2: Migrate existing UPPERCASE enum values to lowercase strings
UPDATE "Order" SET "shippingCarrier_new" = CASE
  WHEN "shippingCarrier"::text = 'COLISSIMO' THEN 'colissimo'
  WHEN "shippingCarrier"::text = 'CHRONOPOST' THEN 'chronopost'
  WHEN "shippingCarrier"::text = 'MONDIAL_RELAY' THEN 'mondial_relay'
  WHEN "shippingCarrier"::text = 'DPD' THEN 'dpd'
  WHEN "shippingCarrier"::text = 'OTHER' THEN 'autre'
  ELSE NULL
END
WHERE "shippingCarrier" IS NOT NULL;

-- Step 3: Drop old column and rename
ALTER TABLE "Order" DROP COLUMN "shippingCarrier";
ALTER TABLE "Order" RENAME COLUMN "shippingCarrier_new" TO "shippingCarrier";

-- Step 4: Drop the enum type (no longer used)
DROP TYPE IF EXISTS "ShippingCarrier";

-- ============================================================================
-- I1. CHECK constraint: Order.total must equal the formula
-- Formula: total = MAX(0, subtotal - discountAmount + shippingCost)
-- Note: taxAmount is extracted FROM the TTC total, not added on top (prices are TTC)
-- ============================================================================

-- Validate no existing data violates the constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "Order"
    WHERE "total" != GREATEST(0, "subtotal" - "discountAmount" + "shippingCost")
    LIMIT 1
  ) THEN
    RAISE EXCEPTION 'Order contains rows where total does not match formula';
  END IF;
END $$;

ALTER TABLE "Order"
  ADD CONSTRAINT "Order_total_formula"
  CHECK ("total" = GREATEST(0, "subtotal" - "discountAmount" + "shippingCost"));

-- ============================================================================
-- I2. CHECK constraint: Discount.usageCount must not exceed maxUsageCount
-- Prevents race conditions where two concurrent checkouts bypass app-level check
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "Discount"
    WHERE "maxUsageCount" IS NOT NULL AND "usageCount" > "maxUsageCount"
    LIMIT 1
  ) THEN
    RAISE EXCEPTION 'Discount contains rows where usageCount exceeds maxUsageCount';
  END IF;
END $$;

ALTER TABLE "Discount"
  ADD CONSTRAINT "Discount_usageCount_within_limit"
  CHECK ("maxUsageCount" IS NULL OR "usageCount" <= "maxUsageCount");

-- ============================================================================
-- I3. VarChar(255) on NewsletterSubscriber.email
-- All other email fields are limited to 255 chars; this one was unbounded
-- ============================================================================

ALTER TABLE "NewsletterSubscriber" ALTER COLUMN "email" TYPE VARCHAR(255);

-- ============================================================================
-- I4. Remove redundant emailVerified column from NewsletterSubscriber
-- The status field (PENDING/CONFIRMED/UNSUBSCRIBED) is the source of truth.
-- Application code already derives emailVerified from status === "CONFIRMED".
-- ============================================================================

ALTER TABLE "NewsletterSubscriber" DROP COLUMN IF EXISTS "emailVerified";

-- ============================================================================
-- M1. Reduce Order.customerName from VarChar(200) to VarChar(100)
-- Aligned with User.name VarChar(100) for consistency
-- ============================================================================

-- Truncate any existing values longer than 100 chars (safety)
UPDATE "Order" SET "customerName" = LEFT("customerName", 100)
WHERE LENGTH("customerName") > 100;

ALTER TABLE "Order" ALTER COLUMN "customerName" TYPE VARCHAR(100);

-- ============================================================================
-- M2. CHECK: ProductSku.compareAtPrice must be >= priceInclTax when set
-- Prevents "negative savings" display in storefront
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "ProductSku"
    WHERE "compareAtPrice" IS NOT NULL AND "compareAtPrice" < "priceInclTax"
    LIMIT 1
  ) THEN
    RAISE EXCEPTION 'ProductSku contains compareAtPrice lower than priceInclTax';
  END IF;
END $$;

ALTER TABLE "ProductSku"
  ADD CONSTRAINT "ProductSku_compareAtPrice_valid"
  CHECK ("compareAtPrice" IS NULL OR "compareAtPrice" >= "priceInclTax");

-- ============================================================================
-- M3. Index [code, isActive, deletedAt] on Discount
-- The discount validation query filters on all three fields.
-- Replaces the existing [code, isActive] index.
-- ============================================================================

DROP INDEX IF EXISTS "Discount_code_isActive_idx";

CREATE INDEX "Discount_code_isActive_deletedAt_idx"
  ON "Discount" ("code", "isActive", "deletedAt");

-- ============================================================================
-- M4. Add deletedAt column to WishlistItem for RGPD traceability
-- ============================================================================

ALTER TABLE "WishlistItem" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- ============================================================================
-- M5. Add discountCode snapshot to DiscountUsage
-- If the discount code is modified later, historical records preserve the
-- original code that was used at checkout time.
-- ============================================================================

-- Add column as nullable first
ALTER TABLE "DiscountUsage" ADD COLUMN "discountCode" VARCHAR(30);

-- Backfill from the Discount table
UPDATE "DiscountUsage" du
SET "discountCode" = d."code"
FROM "Discount" d
WHERE du."discountId" = d."id"
  AND du."discountCode" IS NULL;

-- Set default for any orphaned records (should not happen due to Restrict FK)
UPDATE "DiscountUsage"
SET "discountCode" = 'UNKNOWN'
WHERE "discountCode" IS NULL;

-- Make column non-nullable
ALTER TABLE "DiscountUsage" ALTER COLUMN "discountCode" SET NOT NULL;
