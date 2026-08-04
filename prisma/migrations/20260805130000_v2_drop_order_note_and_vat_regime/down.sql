-- Rollback du Lot 1 de l'audit schéma V2 (2026-08-05).
--
-- ⚠️ Recrée la STRUCTURE, pas les DONNÉES : les lignes `OrderNote` sont
-- définitivement perdues. Pour un retour arrière avec données, passer par le
-- PITR Neon.
--
-- La table est recréée dans sa forme au moment du drop — donc SANS `isInternal`
-- (parti au Lot 0, `20260803120000`) ni `updatedAt` (parti au Lot B,
-- `20260805110000`). Recopier le DDL de `0_init` réintroduirait ces deux colonnes.

-- ---------------------------------------------------------------------------
-- 2. VatRegime
-- ---------------------------------------------------------------------------
-- Recréée seule : la colonne qui la portait (`Order.vendorVatRegime`) est partie
-- au Lot A, et son rollback appartient au down.sql de `20260805100000`.
CREATE TYPE "VatRegime" AS ENUM ('FRANCHISE_BASE', 'NORMAL', 'SIMPLIFIE');

-- ---------------------------------------------------------------------------
-- 1. OrderNote
-- ---------------------------------------------------------------------------
CREATE TABLE "OrderNote" (
    "id" TEXT NOT NULL,
    "orderId" TEXT,
    "content" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorName" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "OrderNote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrderNote_orderId_createdAt_idx" ON "OrderNote"("orderId", "createdAt" DESC);

ALTER TABLE "OrderNote" ADD CONSTRAINT "OrderNote_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
