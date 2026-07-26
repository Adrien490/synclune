-- ============================================================================
-- Rollback de 20260520160219_schema_index_hygiene
-- Restaure l'etat des index tel qu'avant la migration.
-- ============================================================================

-- F2 -- retrait de l'index FK ajoute
DROP INDEX IF EXISTS "ProductSku_productId_idx";

-- F1 -- recreation des index prefixe-redondants
CREATE INDEX "WishlistItem_productId_idx" ON "WishlistItem"("productId");
CREATE INDEX "ProductReview_productId_idx" ON "ProductReview"("productId");

-- F3 -- recreation des index "abandoned-cart recovery"
CREATE INDEX "Cart_userId_abandonedEmailSentAt_updatedAt_idx" ON "Cart"("userId", "abandonedEmailSentAt", "updatedAt");
CREATE INDEX "Cart_guestEmail_abandonedEmailSentAt_updatedAt_idx" ON "Cart"("guestEmail", "abandonedEmailSentAt", "updatedAt");

-- F4 -- recreation de l'index "cross-sell emails"
CREATE INDEX "Order_fulfillmentStatus_actualDelivery_crossSellEmailSentAt_idx" ON "Order"("fulfillmentStatus", "actualDelivery", "crossSellEmailSentAt");
