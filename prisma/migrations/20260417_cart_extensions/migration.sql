-- Cart module extensions 2026-04-17
-- P1: guest contact info, applied discount code, order notes, fulfillment mode
-- P2: gift options (wrap + message) on CartItem
-- Unlocks: abandoned-cart email recovery for guests, discount visibility pre-checkout,
--         Click&Collect future, gift-oriented UX for premium bijoux

-- ============================================================================
-- 1. Enum CartFulfillmentType
-- ============================================================================
CREATE TYPE "CartFulfillmentType" AS ENUM ('SHIPPING', 'CLICK_AND_COLLECT');

-- ============================================================================
-- 2. Cart extensions
-- ============================================================================
ALTER TABLE "Cart"
  ADD COLUMN "guestEmail" VARCHAR(255),
  ADD COLUMN "guestPhone" VARCHAR(30),
  ADD COLUMN "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "guestContactAt" TIMESTAMP(3),
  ADD COLUMN "appliedDiscountCode" VARCHAR(30),
  ADD COLUMN "discountAmountCache" INTEGER,
  ADD COLUMN "notes" VARCHAR(500),
  ADD COLUMN "fulfillmentType" "CartFulfillmentType" NOT NULL DEFAULT 'SHIPPING';

-- Index pour cron abandoned-cart-emails (guests)
CREATE INDEX "Cart_guestEmail_abandonedEmailSentAt_updatedAt_idx"
  ON "Cart" ("guestEmail", "abandonedEmailSentAt", "updatedAt");

-- ============================================================================
-- 3. CartItem extensions (gift options)
-- ============================================================================
ALTER TABLE "CartItem"
  ADD COLUMN "giftWrap" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "giftMessage" VARCHAR(300);
