-- Schema Audit: CHECK constraints, partial unique index, PaymentMethod enum
-- Ref: Prisma Schema Audit P1.1, P1.2, P1.3, P1.5

-- ============================================================================
-- P1.1: CHECK constraints on monetary fields
-- ============================================================================

-- Order.taxAmount (always 0 for micro-entreprise, but enforce non-negative)
ALTER TABLE "Order"
  ADD CONSTRAINT "Order_taxAmount_non_negative" CHECK ("taxAmount" >= 0);

-- Dispute amounts
ALTER TABLE "Dispute"
  ADD CONSTRAINT "Dispute_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "Dispute"
  ADD CONSTRAINT "Dispute_fee_non_negative" CHECK ("fee" >= 0);

-- ============================================================================
-- P1.5: CHECK constraint on ProductReviewStats.averageRating (0.00-5.00)
-- ============================================================================

ALTER TABLE "ProductReviewStats"
  ADD CONSTRAINT "ProductReviewStats_averageRating_range"
  CHECK ("averageRating" >= 0 AND "averageRating" <= 5);

-- ============================================================================
-- P1.2: Partial unique index on ProductSku (excludes soft-deleted)
-- ============================================================================

-- Drop the existing unique constraint that includes soft-deleted SKUs
ALTER TABLE "ProductSku" DROP CONSTRAINT IF EXISTS "ProductSku_productId_colorId_size_materialId_key";

-- Create partial unique index (only active SKUs)
CREATE UNIQUE INDEX "ProductSku_productId_colorId_size_materialId_active_key"
  ON "ProductSku" ("productId", "colorId", "size", "materialId")
  WHERE "deletedAt" IS NULL;

-- ============================================================================
-- P1.3: PaymentMethod enum (replaces VARCHAR string)
-- ============================================================================

-- Create the enum type
CREATE TYPE "PaymentMethod" AS ENUM ('CARD');

-- Convert existing values to uppercase (tests may have inserted lowercase)
UPDATE "Order" SET "paymentMethod" = UPPER("paymentMethod") WHERE "paymentMethod" != UPPER("paymentMethod");

-- Alter column from VARCHAR to enum
ALTER TABLE "Order"
  ALTER COLUMN "paymentMethod" DROP DEFAULT,
  ALTER COLUMN "paymentMethod" TYPE "PaymentMethod" USING ("paymentMethod"::"PaymentMethod"),
  ALTER COLUMN "paymentMethod" SET DEFAULT 'CARD';
