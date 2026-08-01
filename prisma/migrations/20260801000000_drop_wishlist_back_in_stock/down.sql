-- Rollback de `20260801000000_drop_wishlist_back_in_stock`.
--
-- ⚠️ RESTAURE LA STRUCTURE, PAS LES DONNÉES.
--
-- Le `DROP COLUMN "backInStockNotifiedAt"` est destructif : ce script recrée une
-- colonne VIDE. Les valeurs perdues étaient de toute façon mortes (aucun lecteur
-- applicatif depuis le 2026-07-30) — si elles comptaient malgré tout, le seul
-- recovery est un restore Neon PITR antérieur à la migration.

DROP INDEX IF EXISTS "Wishlist_updatedAt_idx";

ALTER TABLE "WishlistItem" ADD COLUMN IF NOT EXISTS "backInStockNotifiedAt" TIMESTAMP(3);

DROP INDEX IF EXISTS "WishlistItem_productId_idx";

CREATE INDEX IF NOT EXISTS "WishlistItem_productId_backInStockNotifiedAt_idx" ON "WishlistItem"("productId", "backInStockNotifiedAt");
