-- Remove over-engineered composite indexes
-- At ~50 orders/month (~600/year), PostgreSQL scans a few thousand rows in milliseconds
-- without specialized indexes. These add write cost and storage with no measurable benefit.
-- Kept: FK indexes, unique constraints, userId/orderId lookups, essential cron indexes.

-- ============================================================================
-- User (3 removed)
-- ============================================================================
DROP INDEX IF EXISTS "User_name_id_idx";
DROP INDEX IF EXISTS "User_createdAt_id_idx";
DROP INDEX IF EXISTS "User_deletedAt_role_idx";

-- ============================================================================
-- Address (1 removed)
-- ============================================================================
DROP INDEX IF EXISTS "Address_userId_createdAt_idx";

-- ============================================================================
-- ProductCollection (2 removed, 1 added: FK reverse lookup)
-- ============================================================================
DROP INDEX IF EXISTS "ProductCollection_collectionId_addedAt_idx";
DROP INDEX IF EXISTS "ProductCollection_collectionId_isFeatured_idx";
CREATE INDEX "ProductCollection_collectionId_idx" ON "ProductCollection"("collectionId");

-- ============================================================================
-- Product (4 removed)
-- ============================================================================
DROP INDEX IF EXISTS "Product_createdAt_id_idx";
DROP INDEX IF EXISTS "Product_deletedAt_status_idx";
DROP INDEX IF EXISTS "Product_status_createdAt_idx";
DROP INDEX IF EXISTS "Product_typeId_status_idx";

-- ============================================================================
-- ProductSku (3 removed, 2 simplified to FK-only)
-- ============================================================================
DROP INDEX IF EXISTS "ProductSku_productId_isActive_inventory_idx";
DROP INDEX IF EXISTS "ProductSku_isActive_inventory_updatedAt_idx";
DROP INDEX IF EXISTS "ProductSku_productId_isDefault_idx";
DROP INDEX IF EXISTS "ProductSku_colorId_isActive_idx";
DROP INDEX IF EXISTS "ProductSku_materialId_isActive_idx";
CREATE INDEX "ProductSku_colorId_idx" ON "ProductSku"("colorId");
CREATE INDEX "ProductSku_materialId_idx" ON "ProductSku"("materialId");

-- ============================================================================
-- SkuMedia (1 removed)
-- ============================================================================
DROP INDEX IF EXISTS "SkuMedia_skuId_mediaType_idx";

-- ============================================================================
-- Order (9 removed)
-- ============================================================================
DROP INDEX IF EXISTS "Order_userId_paymentStatus_deletedAt_createdAt_idx";
DROP INDEX IF EXISTS "Order_status_createdAt_idx";
DROP INDEX IF EXISTS "Order_paymentStatus_paidAt_deletedAt_idx";
DROP INDEX IF EXISTS "Order_deletedAt_status_createdAt_idx";
DROP INDEX IF EXISTS "Order_fulfillmentStatus_actualDelivery_reviewRequestSentAt_d_idx";
DROP INDEX IF EXISTS "Order_paymentStatus_deletedAt_paidAt_idx";
DROP INDEX IF EXISTS "Order_paidAt_paymentStatus_idx";
DROP INDEX IF EXISTS "Order_paymentStatus_createdAt_idx";
DROP INDEX IF EXISTS "Order_createdAt_idx";

-- ============================================================================
-- OrderItem (1 removed)
-- ============================================================================
DROP INDEX IF EXISTS "OrderItem_productId_createdAt_idx";

-- ============================================================================
-- Refund (4 removed)
-- ============================================================================
DROP INDEX IF EXISTS "Refund_createdAt_idx";
DROP INDEX IF EXISTS "Refund_status_createdAt_idx";
DROP INDEX IF EXISTS "Refund_status_processedAt_idx";
DROP INDEX IF EXISTS "Refund_deletedAt_status_createdAt_idx";

-- ============================================================================
-- Discount (2 removed)
-- ============================================================================
DROP INDEX IF EXISTS "Discount_deletedAt_isActive_idx";
DROP INDEX IF EXISTS "Discount_createdAt_id_idx";

-- ============================================================================
-- NewsletterSubscriber (2 removed)
-- ============================================================================
DROP INDEX IF EXISTS "NewsletterSubscriber_status_createdAt_idx";
DROP INDEX IF EXISTS "NewsletterSubscriber_deletedAt_status_subscribedAt_idx";

-- ============================================================================
-- ProductReview (4 removed, 1 added: FK)
-- ============================================================================
DROP INDEX IF EXISTS "ProductReview_productId_status_deletedAt_createdAt_idx";
DROP INDEX IF EXISTS "ProductReview_userId_deletedAt_createdAt_idx";
DROP INDEX IF EXISTS "ProductReview_status_createdAt_idx";
DROP INDEX IF EXISTS "ProductReview_productId_deletedAt_rating_idx";
CREATE INDEX "ProductReview_productId_idx" ON "ProductReview"("productId");

-- ============================================================================
-- ProductReviewStats (1 removed)
-- ============================================================================
DROP INDEX IF EXISTS "ProductReviewStats_averageRating_idx";

-- ============================================================================
-- WebhookEvent (3 removed)
-- ============================================================================
DROP INDEX IF EXISTS "WebhookEvent_eventType_status_idx";
DROP INDEX IF EXISTS "WebhookEvent_status_receivedAt_idx";
DROP INDEX IF EXISTS "WebhookEvent_status_attempts_processedAt_idx";
