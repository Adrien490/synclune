-- Rollback for 20260313_schema_audit_check_constraints
-- Reverses: CHECK constraints (Order, Dispute, ProductReviewStats), partial unique index
-- on ProductSku, PaymentMethod enum conversion back to VARCHAR.
--
-- Prisma does not run down migrations automatically — apply manually via psql:
--   psql $DATABASE_URL -f down.sql
--
-- WARNING: reversing the PaymentMethod enum requires no orders with values
-- outside the historic VARCHAR shape. The enum currently has only 'CARD',
-- so the conversion is lossless.

-- P1.1: drop CHECK constraints
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_taxAmount_non_negative";
ALTER TABLE "Dispute" DROP CONSTRAINT IF EXISTS "Dispute_amount_positive";
ALTER TABLE "Dispute" DROP CONSTRAINT IF EXISTS "Dispute_fee_non_negative";

-- P1.5: drop CHECK on ProductReviewStats
ALTER TABLE "ProductReviewStats" DROP CONSTRAINT IF EXISTS "ProductReviewStats_averageRating_range";

-- P1.2: restore full unique constraint (including soft-deleted) on ProductSku
DROP INDEX IF EXISTS "ProductSku_productId_colorId_size_materialId_active_key";
ALTER TABLE "ProductSku"
  ADD CONSTRAINT "ProductSku_productId_colorId_size_materialId_key"
  UNIQUE ("productId", "colorId", "size", "materialId");

-- P1.3: revert PaymentMethod enum back to VARCHAR
ALTER TABLE "Order"
  ALTER COLUMN "paymentMethod" DROP DEFAULT,
  ALTER COLUMN "paymentMethod" TYPE VARCHAR(20) USING ("paymentMethod"::text),
  ALTER COLUMN "paymentMethod" SET DEFAULT 'CARD';
DROP TYPE IF EXISTS "PaymentMethod";
