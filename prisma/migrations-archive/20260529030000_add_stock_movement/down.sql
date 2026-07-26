-- Rollback — StockMovement (fondations audit des ajustements de stock)
-- ATTENTION : perte de tout l'historique des mouvements de stock enregistrés.

ALTER TABLE "StockMovement" DROP CONSTRAINT IF EXISTS "StockMovement_inventory_non_negative";
ALTER TABLE "StockMovement" DROP CONSTRAINT IF EXISTS "StockMovement_delta_consistent";
ALTER TABLE "StockMovement" DROP CONSTRAINT IF EXISTS "StockMovement_skuId_fkey";

DROP INDEX IF EXISTS "StockMovement_createdById_idx";
DROP INDEX IF EXISTS "StockMovement_productId_createdAt_idx";
DROP INDEX IF EXISTS "StockMovement_skuId_createdAt_idx";

DROP TABLE IF EXISTS "StockMovement";

DROP TYPE IF EXISTS "StockMovementSource";
