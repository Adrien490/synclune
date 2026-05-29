-- ============================================================================
-- StockMovement : audit append-only des mouvements de stock SKU
-- (2026-05-29)
-- ============================================================================
--
-- Contexte :
--   Le formulaire admin d'ajustement de stock collectait une « raison » jamais
--   persistée (étape « Audit log » vide), et la microcopy promettait à tort un
--   historique. Cette table pose les fondations d'un audit immuable des
--   mouvements d'inventaire (delta, raison, admin, date) — sans UI d'historique
--   pour l'instant.
--
--   Modèle immuable (pas d'updatedAt/deletedAt), aligné sur OrderHistory :
--   `createdById` est un String simple (PAS de FK User) + `createdByName`
--   dénormalisé → l'audit survit à une suppression/anonymisation RGPD de l'admin.
-- ============================================================================

CREATE TYPE "StockMovementSource" AS ENUM ('MANUAL_ADJUST', 'SKU_UPDATE', 'ORDER', 'WEBHOOK', 'SYSTEM');

CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "previousInventory" INTEGER NOT NULL,
    "newInventory" INTEGER NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" VARCHAR(500),
    "source" "StockMovementSource" NOT NULL DEFAULT 'MANUAL_ADJUST',
    "createdById" TEXT,
    "createdByName" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StockMovement_skuId_createdAt_idx" ON "StockMovement"("skuId", "createdAt" DESC);
CREATE INDEX "StockMovement_productId_createdAt_idx" ON "StockMovement"("productId", "createdAt" DESC);
CREATE INDEX "StockMovement_createdById_idx" ON "StockMovement"("createdById");

ALTER TABLE "StockMovement"
    ADD CONSTRAINT "StockMovement_skuId_fkey"
    FOREIGN KEY ("skuId")
    REFERENCES "ProductSku"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;

-- Garde-fous cohérence (audit immuable) :
--   new = previous + delta, et stocks toujours >= 0
ALTER TABLE "StockMovement"
    ADD CONSTRAINT "StockMovement_delta_consistent"
    CHECK ("newInventory" = "previousInventory" + "delta");

ALTER TABLE "StockMovement"
    ADD CONSTRAINT "StockMovement_inventory_non_negative"
    CHECK ("previousInventory" >= 0 AND "newInventory" >= 0);
