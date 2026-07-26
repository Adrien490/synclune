-- Schema audit hardening migration
-- Fixes identified during comprehensive Prisma schema audit (Feb 2026)

-- ============================================================================
-- 1. DiscountUsage: Cascade -> Restrict (protect accounting data)
-- ============================================================================

ALTER TABLE "DiscountUsage" DROP CONSTRAINT IF EXISTS "DiscountUsage_discountId_fkey";

ALTER TABLE "DiscountUsage"
  ADD CONSTRAINT "DiscountUsage_discountId_fkey"
  FOREIGN KEY ("discountId") REFERENCES "Discount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================================
-- 2. NewsletterSubscriber: Remove cuid() default on unsubscribeToken
--    Token is now generated via crypto.randomUUID() in application code
-- ============================================================================

ALTER TABLE "NewsletterSubscriber" ALTER COLUMN "unsubscribeToken" DROP DEFAULT;

-- ============================================================================
-- 3. VarChar constraints on Address fields (previously unbounded TEXT)
-- ============================================================================

ALTER TABLE "Address" ALTER COLUMN "firstName" TYPE VARCHAR(50);
ALTER TABLE "Address" ALTER COLUMN "lastName" TYPE VARCHAR(50);
ALTER TABLE "Address" ALTER COLUMN "address1" TYPE VARCHAR(255);
ALTER TABLE "Address" ALTER COLUMN "address2" TYPE VARCHAR(255);
ALTER TABLE "Address" ALTER COLUMN "city" TYPE VARCHAR(100);
ALTER TABLE "Address" ALTER COLUMN "phone" TYPE VARCHAR(20);

-- ============================================================================
-- 4. VarChar constraints on Order shipping/customer fields
-- ============================================================================

ALTER TABLE "Order" ALTER COLUMN "customerPhone" TYPE VARCHAR(20);
ALTER TABLE "Order" ALTER COLUMN "shippingFirstName" TYPE VARCHAR(50);
ALTER TABLE "Order" ALTER COLUMN "shippingLastName" TYPE VARCHAR(50);
ALTER TABLE "Order" ALTER COLUMN "shippingAddress1" TYPE VARCHAR(255);
ALTER TABLE "Order" ALTER COLUMN "shippingAddress2" TYPE VARCHAR(255);
ALTER TABLE "Order" ALTER COLUMN "shippingCity" TYPE VARCHAR(100);
ALTER TABLE "Order" ALTER COLUMN "shippingPhone" TYPE VARCHAR(20);
ALTER TABLE "Order" ALTER COLUMN "trackingUrl" TYPE VARCHAR(2048);

-- ============================================================================
-- 5. VarChar constraints on OrderItem snapshot fields
-- ============================================================================

ALTER TABLE "OrderItem" ALTER COLUMN "productTitle" TYPE VARCHAR(200);
ALTER TABLE "OrderItem" ALTER COLUMN "productImageUrl" TYPE VARCHAR(2048);
ALTER TABLE "OrderItem" ALTER COLUMN "skuColor" TYPE VARCHAR(100);
ALTER TABLE "OrderItem" ALTER COLUMN "skuMaterial" TYPE VARCHAR(100);
ALTER TABLE "OrderItem" ALTER COLUMN "skuSize" TYPE VARCHAR(50);
ALTER TABLE "OrderItem" ALTER COLUMN "skuImageUrl" TYPE VARCHAR(2048);

-- ============================================================================
-- 6. VarChar constraint on SkuMedia.altText
-- ============================================================================

ALTER TABLE "SkuMedia" ALTER COLUMN "altText" TYPE VARCHAR(255);

-- ============================================================================
-- 7. CustomizationRequest: Add optional userId FK for RGPD compliance
-- ============================================================================

ALTER TABLE "CustomizationRequest" ADD COLUMN "userId" TEXT;

ALTER TABLE "CustomizationRequest"
  ADD CONSTRAINT "CustomizationRequest_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- 8. Remove unused indexes (identified by audit - no matching queries)
-- ============================================================================

-- User: suspendedAt - no query uses this field as filter
DROP INDEX IF EXISTS "User_suspendedAt_idx";

-- User: anonymizedAt - cron uses accountStatus, not anonymizedAt
DROP INDEX IF EXISTS "User_anonymizedAt_idx";

-- Product: title + id - sorting done in JS, not SQL
DROP INDEX IF EXISTS "Product_title_id_idx";

-- OrderNote: deletedAt alone - covered by [orderId, createdAt] composite
DROP INDEX IF EXISTS "OrderNote_deletedAt_idx";

-- DiscountUsage: userId + createdAt - no "usage history" query exists
DROP INDEX IF EXISTS "DiscountUsage_userId_createdAt_idx";

-- ReviewResponse: authorId + createdAt - no "my responses" query exists
DROP INDEX IF EXISTS "ReviewResponse_authorId_createdAt_idx";

-- ProductReviewStats: averageRating + totalCount - "best rated" not implemented
DROP INDEX IF EXISTS "ProductReviewStats_averageRating_totalCount_idx";

-- CustomizationRequest: deletedAt alone - covered by [deletedAt, status] composite
DROP INDEX IF EXISTS "CustomizationRequest_deletedAt_idx";

-- DiscountUsage: deletedAt + discountId - DiscountUsage has no deletedAt field
-- (was added in error by 20260206_audit_fixes migration)
DROP INDEX IF EXISTS "DiscountUsage_deletedAt_discountId_idx";

-- ============================================================================
-- 9. VarChar constraints on Better Auth fields (security hardening)
-- ============================================================================

ALTER TABLE "Account" ALTER COLUMN "password" TYPE VARCHAR(255);
ALTER TABLE "Verification" ALTER COLUMN "value" TYPE VARCHAR(500);
ALTER TABLE "Session" ALTER COLUMN "token" TYPE VARCHAR(500);

-- ============================================================================
-- 10. CHECK constraints on financial amounts (DB-level safety net)
--     Validation Zod exists server-side, but DB is the last line of defense
--     for accounting data integrity (Art. L123-22 Code de Commerce)
-- ============================================================================

-- Validate no existing data violates the new constraints
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Order" WHERE "subtotal" < 0 LIMIT 1) THEN
    RAISE EXCEPTION 'Order contains negative subtotal';
  END IF;
  IF EXISTS (SELECT 1 FROM "Order" WHERE "total" < 0 LIMIT 1) THEN
    RAISE EXCEPTION 'Order contains negative total';
  END IF;
  IF EXISTS (SELECT 1 FROM "Order" WHERE "discountAmount" < 0 LIMIT 1) THEN
    RAISE EXCEPTION 'Order contains negative discountAmount';
  END IF;
  IF EXISTS (SELECT 1 FROM "Order" WHERE "shippingCost" < 0 LIMIT 1) THEN
    RAISE EXCEPTION 'Order contains negative shippingCost';
  END IF;
  IF EXISTS (SELECT 1 FROM "OrderItem" WHERE "price" <= 0 LIMIT 1) THEN
    RAISE EXCEPTION 'OrderItem contains non-positive price';
  END IF;
  IF EXISTS (SELECT 1 FROM "OrderItem" WHERE "quantity" <= 0 LIMIT 1) THEN
    RAISE EXCEPTION 'OrderItem contains non-positive quantity';
  END IF;
  IF EXISTS (SELECT 1 FROM "Refund" WHERE "amount" <= 0 LIMIT 1) THEN
    RAISE EXCEPTION 'Refund contains non-positive amount';
  END IF;
  IF EXISTS (SELECT 1 FROM "RefundItem" WHERE "amount" <= 0 LIMIT 1) THEN
    RAISE EXCEPTION 'RefundItem contains non-positive amount';
  END IF;
  IF EXISTS (SELECT 1 FROM "CartItem" WHERE "priceAtAdd" <= 0 LIMIT 1) THEN
    RAISE EXCEPTION 'CartItem contains non-positive priceAtAdd';
  END IF;
  IF EXISTS (SELECT 1 FROM "ProductSku" WHERE "priceInclTax" <= 0 LIMIT 1) THEN
    RAISE EXCEPTION 'ProductSku contains non-positive priceInclTax';
  END IF;
  IF EXISTS (SELECT 1 FROM "Discount" WHERE "type" = 'PERCENTAGE' AND "value" > 100 LIMIT 1) THEN
    RAISE EXCEPTION 'Discount PERCENTAGE value exceeds 100';
  END IF;
END $$;

-- Order amounts
ALTER TABLE "Order"
  ADD CONSTRAINT "Order_subtotal_non_negative" CHECK ("subtotal" >= 0);
ALTER TABLE "Order"
  ADD CONSTRAINT "Order_total_non_negative" CHECK ("total" >= 0);
ALTER TABLE "Order"
  ADD CONSTRAINT "Order_discountAmount_non_negative" CHECK ("discountAmount" >= 0);
ALTER TABLE "Order"
  ADD CONSTRAINT "Order_shippingCost_non_negative" CHECK ("shippingCost" >= 0);

-- OrderItem amounts
ALTER TABLE "OrderItem"
  ADD CONSTRAINT "OrderItem_price_positive" CHECK ("price" > 0);
ALTER TABLE "OrderItem"
  ADD CONSTRAINT "OrderItem_quantity_positive" CHECK ("quantity" > 0);

-- Refund amounts
ALTER TABLE "Refund"
  ADD CONSTRAINT "Refund_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "RefundItem"
  ADD CONSTRAINT "RefundItem_amount_positive" CHECK ("amount" > 0);

-- Cart pricing
ALTER TABLE "CartItem"
  ADD CONSTRAINT "CartItem_priceAtAdd_positive" CHECK ("priceAtAdd" > 0);

-- ProductSku pricing
ALTER TABLE "ProductSku"
  ADD CONSTRAINT "ProductSku_priceInclTax_positive" CHECK ("priceInclTax" > 0);

-- Discount: percentage must be <= 100
ALTER TABLE "Discount"
  ADD CONSTRAINT "Discount_percentage_max_100"
  CHECK ("type" != 'PERCENTAGE' OR "value" <= 100);
