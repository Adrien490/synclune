-- Rollback du Lot A de l'audit schéma V1 (2026-08-05).
--
-- ⚠️ Recrée la STRUCTURE, pas les DONNÉES : les lignes `StockMovement` et les
-- valeurs `Order.vendor*` supprimées ne sont pas récupérables ici. Pour un vrai
-- retour arrière avec données, passer par le PITR Neon.
--
-- Les colonnes `vendor*` reviennent NULL : `buildSellerInfo` retombait déjà sur
-- l'env pour une valeur nulle, donc l'application reste cohérente après rollback.

-- ---------------------------------------------------------------------------
-- 5. Index sans requête
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS "OrderHistory_authorId_idx" ON "OrderHistory"("authorId");
CREATE INDEX IF NOT EXISTS "User_email_unaccent_trgm_idx" ON "User" USING gin (immutable_unaccent(email) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "User_name_unaccent_trgm_idx" ON "User" USING gin (immutable_unaccent(COALESCE(name, '')) gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- 4. Valeurs d'enum
-- ---------------------------------------------------------------------------
ALTER TYPE "InvoiceStatus" ADD VALUE IF NOT EXISTS 'PENDING' BEFORE 'GENERATED';
ALTER TYPE "WebhookEventStatus" ADD VALUE IF NOT EXISTS 'PENDING' BEFORE 'PROCESSING';
-- Note : `ALTER TYPE … ADD VALUE` ne peut pas tourner dans la même transaction
-- que l'`ALTER COLUMN … SET DEFAULT` qui suit. Appliquer ce fichier statement par
-- statement (autocommit), pas dans un BEGIN/COMMIT global.
ALTER TABLE "WebhookEvent" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- ---------------------------------------------------------------------------
-- 3. Colonnes écrites et jamais relues
-- ---------------------------------------------------------------------------
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "skuImageUrl" VARCHAR(2048);
ALTER TABLE "WebhookEvent" ADD COLUMN IF NOT EXISTS "errorMessage" TEXT;
-- `amountApplied` était NOT NULL : on la recrée nullable puis on la remplit depuis
-- `Order.discountAmount` (la valeur dont elle était le doublon) avant de reposer
-- la contrainte. Une commande sans remise n'a pas de ligne DiscountUsage.
ALTER TABLE "DiscountUsage" ADD COLUMN IF NOT EXISTS "amountApplied" INTEGER;
UPDATE "DiscountUsage" du
SET "amountApplied" = COALESCE(o."discountAmount", 0)
FROM "Order" o
WHERE o."id" = du."orderId" AND du."amountApplied" IS NULL;
UPDATE "DiscountUsage" SET "amountApplied" = 0 WHERE "amountApplied" IS NULL;
ALTER TABLE "DiscountUsage" ALTER COLUMN "amountApplied" SET NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. Order.vendor* + leurs CHECK de format
-- ---------------------------------------------------------------------------
ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "vendorLegalName" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "vendorTradeName" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "vendorAddress" VARCHAR(500),
  ADD COLUMN IF NOT EXISTS "vendorSiren" VARCHAR(9),
  ADD COLUMN IF NOT EXISTS "vendorSiret" VARCHAR(14),
  ADD COLUMN IF NOT EXISTS "vendorVatNumber" VARCHAR(15),
  ADD COLUMN IF NOT EXISTS "vendorEmail" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "vendorApeCode" VARCHAR(10),
  ADD COLUMN IF NOT EXISTS "vendorBankIban" VARCHAR(34),
  ADD COLUMN IF NOT EXISTS "vendorBankBic" VARCHAR(11),
  ADD COLUMN IF NOT EXISTS "vendorVatRegime" "VatRegime",
  ADD COLUMN IF NOT EXISTS "vendorLegalForm" VARCHAR(100);

ALTER TABLE "Order" ADD CONSTRAINT "Order_vendorApeCode_format_check" CHECK ("vendorApeCode" IS NULL OR "vendorApeCode" ~ '^[0-9]{2}\.[0-9]{2}[A-Z]$');
ALTER TABLE "Order" ADD CONSTRAINT "Order_vendorBankBic_format_check" CHECK ("vendorBankBic" IS NULL OR "vendorBankBic" ~ '^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$');
ALTER TABLE "Order" ADD CONSTRAINT "Order_vendorBankIban_format_check" CHECK ("vendorBankIban" IS NULL OR "vendorBankIban" ~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{4,30}$');
ALTER TABLE "Order" ADD CONSTRAINT "Order_vendorSiren_format_check" CHECK ("vendorSiren" IS NULL OR "vendorSiren" ~ '^[0-9]{9}$');
ALTER TABLE "Order" ADD CONSTRAINT "Order_vendorSiret_format_check" CHECK ("vendorSiret" IS NULL OR "vendorSiret" ~ '^[0-9]{14}$');
ALTER TABLE "Order" ADD CONSTRAINT "Order_vendorVatNumber_format_check" CHECK ("vendorVatNumber" IS NULL OR "vendorVatNumber" ~ '^[A-Z]{2}[A-Z0-9]{2,13}$');

-- ---------------------------------------------------------------------------
-- 1. StockMovement
-- ---------------------------------------------------------------------------
CREATE TYPE "StockMovementSource" AS ENUM ('MANUAL_ADJUST', 'SKU_UPDATE', 'ORDER', 'WEBHOOK');

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

ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_skuId_fkey"
  FOREIGN KEY ("skuId") REFERENCES "ProductSku"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_delta_consistent" CHECK ("newInventory" = "previousInventory" + "delta");
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_inventory_non_negative" CHECK ("previousInventory" >= 0 AND "newInventory" >= 0);
