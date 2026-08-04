-- Rollback Lot 6 — recrée la structure, pas les données (les valeurs
-- Refund.deletedAt et RefundItem.restock supprimées ne sont pas restaurables ;
-- les valeurs d'enum réintroduites arrivent en fin de type, l'ordre exact
-- d'origine n'a pas d'effet applicatif).

-- Enums : réintroduire les valeurs droppées.
ALTER TYPE "RefundStatus" ADD VALUE IF NOT EXISTS 'REJECTED';
ALTER TYPE "RefundReason" ADD VALUE IF NOT EXISTS 'WRONG_ITEM';
ALTER TYPE "RefundReason" ADD VALUE IF NOT EXISTS 'LOST_IN_TRANSIT';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';
ALTER TYPE "StockMovementSource" ADD VALUE IF NOT EXISTS 'SYSTEM';

-- Colonnes.
ALTER TABLE "Refund" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "RefundItem" ADD COLUMN IF NOT EXISTS "restock" BOOLEAN NOT NULL DEFAULT true;

-- FK Refund.createdBy → User (relation "RefundCreator").
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
