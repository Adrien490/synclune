-- ============================================================================
-- Schema index hygiene (audit schema.prisma 2026-05-20)
-- - F1 : drop 2 index prefixe-redondants (deja couverts par un index composite
--        ayant la meme colonne en tete -> write-amplification inutile).
-- - F3/F4 : drop 3 index morts, scaffolding sans cron cable (relance panier
--           abandonne + cross-sell emails). Les COLONNES sont conservees.
-- - F2 : ajoute l'index FK manquant ProductSku.productId (seul FK du schema
--        sans index explicite ; tous les autres modeles indexent leurs FK).
-- Aucun DROP COLUMN : zero impact donnees, zero impact code applicatif.
-- ============================================================================

-- F1 -- index prefixe-redondants (couverts par un composite (productId, ...))
DROP INDEX IF EXISTS "WishlistItem_productId_idx";
DROP INDEX IF EXISTS "ProductReview_productId_idx";

-- F3 -- scaffolding "abandoned-cart recovery" (aucun cron de relance cable ;
--       Cart.userId garde son index via la contrainte @unique)
DROP INDEX IF EXISTS "Cart_userId_abandonedEmailSentAt_updatedAt_idx";
DROP INDEX IF EXISTS "Cart_guestEmail_abandonedEmailSentAt_updatedAt_idx";

-- F4 -- scaffolding "cross-sell emails" (aucun cron cross-sell cable)
DROP INDEX IF EXISTS "Order_fulfillmentStatus_actualDelivery_crossSellEmailSentAt_idx";

-- F2 -- index FK manquant : lookups ProductSku par produit (incl. soft-deleted)
CREATE INDEX "ProductSku_productId_idx" ON "ProductSku"("productId");
