-- Remove 37 unused/redundant indexes identified by audit
-- These indexes were either: redundant with @unique constraints, redundant with
-- composite indexes (leading column), on reference tables too small to benefit,
-- or had no matching query patterns in the codebase.

-- ============================================================================
-- 1. Reference tables < 100 rows (9 indexes)
-- PostgreSQL prefers seq scan on small tables
-- ============================================================================

-- ProductType
DROP INDEX IF EXISTS "ProductType_isActive_idx";
DROP INDEX IF EXISTS "ProductType_label_id_idx";

-- Color
DROP INDEX IF EXISTS "Color_name_id_idx";
DROP INDEX IF EXISTS "Color_isActive_idx";

-- Material
DROP INDEX IF EXISTS "Material_name_id_idx";
DROP INDEX IF EXISTS "Material_isActive_idx";

-- Collection
DROP INDEX IF EXISTS "Collection_name_id_idx";
DROP INDEX IF EXISTS "Collection_createdAt_id_idx";
DROP INDEX IF EXISTS "Collection_status_id_idx";

-- ============================================================================
-- 2. Redundant with @unique (8 indexes)
-- @unique already creates a unique index in PostgreSQL
-- ============================================================================

-- Cart (userId and sessionId have @unique)
DROP INDEX IF EXISTS "Cart_userId_idx";
DROP INDEX IF EXISTS "Cart_sessionId_idx";

-- Wishlist (userId and sessionId have @unique)
DROP INDEX IF EXISTS "Wishlist_userId_idx";
DROP INDEX IF EXISTS "Wishlist_sessionId_idx";

-- Order (stripePaymentIntentId and stripeCheckoutSessionId have @unique)
DROP INDEX IF EXISTS "Order_stripePaymentIntentId_idx";
DROP INDEX IF EXISTS "Order_stripeCheckoutSessionId_idx";

-- Newsletter (confirmationToken and userId have @unique)
DROP INDEX IF EXISTS "NewsletterSubscriber_confirmationToken_idx";
DROP INDEX IF EXISTS "NewsletterSubscriber_userId_idx";

-- ============================================================================
-- 3. Redundant with composite indexes - leading column (5 indexes)
-- PostgreSQL uses composite index (A, B) for queries filtering on A alone
-- ============================================================================

-- CartItem: @@index([cartId]) covered by @@unique([cartId, skuId])
DROP INDEX IF EXISTS "CartItem_cartId_idx";

-- WishlistItem: @@index([wishlistId]) covered by @@unique([wishlistId, productId])
DROP INDEX IF EXISTS "WishlistItem_wishlistId_idx";

-- ProductCollection: @@index([productId]) covered by @@unique([productId, collectionId])
DROP INDEX IF EXISTS "ProductCollection_productId_idx";

-- Order: @@index([userId]) covered by @@index([userId, createdAt DESC])
DROP INDEX IF EXISTS "Order_userId_idx";

-- OrderItem: @@index([productId]) covered by @@index([productId, createdAt DESC])
DROP INDEX IF EXISTS "OrderItem_productId_idx";

-- ============================================================================
-- 4. No matching query patterns in codebase (12 indexes)
-- ============================================================================

-- OrderHistory: never filtered by action, authorId alone, or createdAt alone
DROP INDEX IF EXISTS "OrderHistory_action_idx";
DROP INDEX IF EXISTS "OrderHistory_authorId_idx";
DROP INDEX IF EXISTS "OrderHistory_createdAt_idx";

-- OrderNote: never filtered by authorId on OrderNote
DROP INDEX IF EXISTS "OrderNote_authorId_createdAt_idx";

-- OrderItem: no query with this exact pair + productId already covered
DROP INDEX IF EXISTS "OrderItem_productId_orderId_idx";

-- Order: no query filtering by shippedAt + fulfillmentStatus
DROP INDEX IF EXISTS "Order_shippedAt_fulfillmentStatus_idx";

-- Order: wrong leading column for actual queries (paymentStatus leads, covered elsewhere)
DROP INDEX IF EXISTS "Order_paidAt_paymentStatus_deletedAt_idx";

-- Order: stripeCustomerId never in WHERE, only in SELECT
DROP INDEX IF EXISTS "Order_stripeCustomerId_idx";

-- Order: stripeChargeId never in WHERE, only in SELECT
DROP INDEX IF EXISTS "Order_stripeChargeId_idx";

-- ProductSku: price filtering done in JS, not SQL
DROP INDEX IF EXISTS "ProductSku_isActive_priceInclTax_idx";

-- Newsletter: emailVerified is only written, never filtered
DROP INDEX IF EXISTS "NewsletterSubscriber_emailVerified_status_idx";

-- Newsletter: confirmedAt NULL cleanup has low selectivity
DROP INDEX IF EXISTS "NewsletterSubscriber_confirmedAt_idx";

-- ============================================================================
-- 5. Redundant with similar composite indexes (2 indexes)
-- ============================================================================

-- ProductSku: covered by @@index([productId, isActive, inventory]) (same leading columns)
DROP INDEX IF EXISTS "ProductSku_productId_isActive_deletedAt_idx";

-- Newsletter: covered by @@index([deletedAt, status, subscribedAt]) (leading column)
DROP INDEX IF EXISTS "NewsletterSubscriber_deletedAt_idx";

-- ============================================================================
-- 6. Cart index with no matching query (1 index)
-- ============================================================================

-- Cart: no query filtering by createdAt + userId
DROP INDEX IF EXISTS "Cart_createdAt_userId_idx";
