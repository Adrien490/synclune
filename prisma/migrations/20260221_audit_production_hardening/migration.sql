-- ============================================================================
-- S1: Remove phantom stripeChargeId from Order
-- Never populated by any webhook handler, refunds work via stripePaymentIntentId
-- ============================================================================

DROP INDEX IF EXISTS "Order_stripeChargeId_key";
ALTER TABLE "Order" DROP COLUMN IF EXISTS "stripeChargeId";

-- ============================================================================
-- S2: Create Dispute model for Stripe chargebacks
-- Replaces unstructured OrderNote tracking with proper model
-- ============================================================================

-- Enums
CREATE TYPE "DisputeStatus" AS ENUM ('NEEDS_RESPONSE', 'UNDER_REVIEW', 'WON', 'LOST', 'CHARGE_REFUNDED');
CREATE TYPE "DisputeReason" AS ENUM ('DUPLICATE', 'FRAUDULENT', 'SUBSCRIPTION_CANCELED', 'PRODUCT_UNACCEPTABLE', 'PRODUCT_NOT_RECEIVED', 'UNRECOGNIZED', 'CREDIT_NOT_PROCESSED', 'GENERAL');

-- Table
CREATE TABLE "Dispute" (
    "id" TEXT NOT NULL,
    "stripeDisputeId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "fee" INTEGER NOT NULL DEFAULT 0,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'EUR',
    "reason" "DisputeReason" NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'NEEDS_RESPONSE',
    "dueBy" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

-- Unique constraint on Stripe dispute ID
CREATE UNIQUE INDEX "Dispute_stripeDisputeId_key" ON "Dispute"("stripeDisputeId");

-- Indexes
CREATE INDEX "Dispute_orderId_idx" ON "Dispute"("orderId");
CREATE INDEX "Dispute_status_dueBy_idx" ON "Dispute"("status", "dueBy");

-- Foreign key
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================================
-- S3: Add missing index on Order.stripeCustomerId
-- Only Stripe ID without index on Order table
-- ============================================================================

CREATE INDEX "Order_stripeCustomerId_idx" ON "Order"("stripeCustomerId");

-- ============================================================================
-- M1: Add EXPIRED to PaymentStatus enum
-- Distinguishes session expiry from actual payment failures
-- ============================================================================

ALTER TYPE "PaymentStatus" ADD VALUE 'EXPIRED';

-- ============================================================================
-- M4: Add CHECK constraints on currency fields
-- Enforces EUR-only at DB level (Synclune only operates in EUR)
-- ============================================================================

ALTER TABLE "Order" ADD CONSTRAINT "Order_currency_eur_check" CHECK (currency = 'EUR');
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_currency_eur_check" CHECK (currency = 'EUR');
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_currency_eur_check" CHECK (currency = 'EUR');
