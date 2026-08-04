-- Rollback du Lot B de l'audit schéma V1 (2026-08-05).
--
-- ⚠️ Recrée la STRUCTURE, pas l'HISTOIRE : les colonnes d'horodatage reviennent
-- avec `now()` pour les lignes existantes, pas avec leur valeur d'origine (elle
-- est perdue). Les `id` cuid2 des tables de jointure sont régénérés.

-- ---------------------------------------------------------------------------
-- PK composite → clé surrogate
-- ---------------------------------------------------------------------------
ALTER TABLE "ProductSkuColor" DROP CONSTRAINT "ProductSkuColor_pkey";
ALTER TABLE "ProductSkuColor" ADD COLUMN "id" TEXT;
UPDATE "ProductSkuColor" SET "id" = gen_random_uuid()::text WHERE "id" IS NULL;
ALTER TABLE "ProductSkuColor" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "ProductSkuColor" ADD CONSTRAINT "ProductSkuColor_pkey" PRIMARY KEY ("id");
CREATE UNIQUE INDEX "ProductSkuColor_skuId_colorId_key" ON "ProductSkuColor"("skuId", "colorId");

ALTER TABLE "ProductSkuMaterial" DROP CONSTRAINT "ProductSkuMaterial_pkey";
ALTER TABLE "ProductSkuMaterial" ADD COLUMN "id" TEXT;
UPDATE "ProductSkuMaterial" SET "id" = gen_random_uuid()::text WHERE "id" IS NULL;
ALTER TABLE "ProductSkuMaterial" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "ProductSkuMaterial" ADD CONSTRAINT "ProductSkuMaterial_pkey" PRIMARY KEY ("id");
CREATE UNIQUE INDEX "ProductSkuMaterial_skuId_materialId_key" ON "ProductSkuMaterial"("skuId", "materialId");

-- ---------------------------------------------------------------------------
-- Horodatages
-- ---------------------------------------------------------------------------
ALTER TABLE "StoreSettings" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "OrderItem" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "OrderNote" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "DiscountUsage"
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "SkuMedia"
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ProductCollection"
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ProductSkuColor"
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ProductSkuMaterial"
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
