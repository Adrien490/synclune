-- Rollback de 20260726235500_trim_stock_movement_indexes.
-- Recrée les deux index à l'identique de 20260529030000_add_stock_movement.

CREATE INDEX IF NOT EXISTS "StockMovement_productId_createdAt_idx" ON "StockMovement"("productId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "StockMovement_createdById_idx" ON "StockMovement"("createdById");
