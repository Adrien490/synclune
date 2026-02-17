-- Production Readiness Audit - February 2026
-- Addresses findings from the Prisma schema audit (score 88/100 → target 95+)

-- ============================================================================
-- SECURITY: Add VarChar constraint on Order.stripeCustomerId
-- ============================================================================

ALTER TABLE "Order"
  ALTER COLUMN "stripeCustomerId" TYPE VARCHAR(50);

-- ============================================================================
-- INTEGRITY: CHECK constraints for Discount nullable fields
-- When non-null, these values must be positive
-- ============================================================================

ALTER TABLE "Discount"
  ADD CONSTRAINT "Discount_maxUsagePerUser_positive"
  CHECK ("maxUsagePerUser" IS NULL OR "maxUsagePerUser" > 0);

ALTER TABLE "Discount"
  ADD CONSTRAINT "Discount_minOrderAmount_positive"
  CHECK ("minOrderAmount" IS NULL OR "minOrderAmount" > 0);

-- ============================================================================
-- PERFORMANCE: Missing indexes
-- ============================================================================

-- 1. Review-request cron: add deletedAt to existing composite index
--    Old: [fulfillmentStatus, actualDelivery, reviewRequestSentAt]
--    New: [fulfillmentStatus, actualDelivery, reviewRequestSentAt, deletedAt]
DROP INDEX IF EXISTS "Order_fulfillmentStatus_actualDelivery_reviewRequestSentAt_idx";
CREATE INDEX "Order_fulfillmentStatus_actualDelivery_reviewRequestSentAt_d_idx"
  ON "Order" ("fulfillmentStatus", "actualDelivery", "reviewRequestSentAt", "deletedAt");

-- 2. Retry-webhooks cron: [status, attempts, processedAt]
CREATE INDEX "WebhookEvent_status_attempts_processedAt_idx"
  ON "WebhookEvent" ("status", "attempts", "processedAt");

-- 3. Dashboard recent orders: [paymentStatus, deletedAt, paidAt DESC]
CREATE INDEX "Order_paymentStatus_deletedAt_paidAt_idx"
  ON "Order" ("paymentStatus", "deletedAt", "paidAt" DESC);

-- 4. ProductReviewStats: averageRating for filter/sort queries
CREATE INDEX "ProductReviewStats_averageRating_idx"
  ON "ProductReviewStats" ("averageRating");
