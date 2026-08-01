-- Retrait du reliquat back-in-stock sur WishlistItem (audit wishlist 2026-08-01)
--
-- Le système de notification « retour en stock » a été supprimé du code le
-- 2026-07-30 (commit 568f53191, avec toute la catégorie marketing), mais la
-- colonne `backInStockNotifiedAt` et son index composite étaient restés en base
-- et dans le schéma — sans plus aucun lecteur ni écrivain applicatif (le seed
-- était le dernier écrivain, retiré avec cette migration).
--
-- ⚠️ L'index composite couvrait `productId` seul en PRÉFIXE : l'index simple
-- `WishlistItem_productId_idx` avait été droppé comme redondant par
-- `20260520160219_schema_index_hygiene` (archive). Le supprimer nu casserait le
-- lookup FK reverse `WHERE "productId" = ?` (delete-product, cascades) — d'où le
-- remplacement par un index simple dans la même migration.

DROP INDEX "WishlistItem_productId_backInStockNotifiedAt_idx";

CREATE INDEX "WishlistItem_productId_idx" ON "WishlistItem"("productId");

ALTER TABLE "WishlistItem" DROP COLUMN "backInStockNotifiedAt";

-- ============================================================================
-- Index de purge RGPD des wishlists invitées
-- ============================================================================
-- La passe `cleanupInactiveWishlists()` (route cron `cleanup-pending-orders`)
-- supprime les wishlists guest inactives : `userId IS NULL AND updatedAt < cutoff`
-- (30 j de cookie glissant + 7 j de grâce). `updatedAt` sert de date de dernière
-- interaction — cet index évite un seq scan quotidien sur la table.

CREATE INDEX "Wishlist_updatedAt_idx" ON "Wishlist"("updatedAt");
