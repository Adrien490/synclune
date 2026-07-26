-- ============================================================================
-- M2M Sku <-> Color : permettre plusieurs couleurs par variante (bague bicolore
-- or rose + argent, dégradé tricolore, etc.)
-- - Ajoute la table de jointure ProductSkuColor (avec ordre = priorité via `position`)
-- - Backfille depuis l'ancien `ProductSku.colorId` (1 ligne par SKU non-null, position=0)
-- - Drop l'ancien FK + colonne + index FK
-- - Drop l'ancien index unique partiel (productId, colorId, size) : la color
--   devenant M2M, elle ne peut plus servir de discriminateur de variant-identity.
--   La global `sku.sku @unique` reste le garde-fou ; le combo couleurs est validé
--   côté application (cf. variant-card admin + ColorMultiSelectField cap 3).
-- Plan : /Users/adrienpoirier/.claude/plans/termine-l-impl-mentation-multi-couleurs-humble-cherny.md
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Création de la table de jointure
-- ----------------------------------------------------------------------------
CREATE TABLE "ProductSkuColor" (
    "id" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "colorId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductSkuColor_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductSkuColor_skuId_colorId_key"
    ON "ProductSkuColor"("skuId", "colorId");

CREATE INDEX "ProductSkuColor_colorId_idx"
    ON "ProductSkuColor"("colorId");

CREATE INDEX "ProductSkuColor_skuId_position_idx"
    ON "ProductSkuColor"("skuId", "position");

ALTER TABLE "ProductSkuColor"
    ADD CONSTRAINT "ProductSkuColor_skuId_fkey"
    FOREIGN KEY ("skuId") REFERENCES "ProductSku"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductSkuColor"
    ADD CONSTRAINT "ProductSkuColor_colorId_fkey"
    FOREIGN KEY ("colorId") REFERENCES "Color"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------------------------------------------------------
-- 2. Backfill depuis l'ancien `ProductSku.colorId`
--    gen_random_uuid() est disponible sans extension sur Postgres >= 13 (Neon OK).
--    Préfixe `csc_` (color-sku-color) pour distinguer des cuid() applicatifs.
-- ----------------------------------------------------------------------------
INSERT INTO "ProductSkuColor" ("id", "skuId", "colorId", "position", "addedAt", "createdAt", "updatedAt")
SELECT
    'csc_' || replace(gen_random_uuid()::text, '-', ''),
    "id",
    "colorId",
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "ProductSku"
WHERE "colorId" IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 3. Drop de l'ancien index unique partiel + FK + colonne + index FK
--    L'index unique partiel (productId, colorId, size) ne peut être recréé sans
--    colorId : 2 SKUs même produit/taille avec combos couleurs différents doivent
--    coexister. La global `sku.sku @unique` reste le garde-fou ; le combo couleurs
--    est validé côté application (form admin + cap ARRAY_LIMITS.SKU_COLORS).
-- ----------------------------------------------------------------------------
DROP INDEX IF EXISTS "ProductSku_productId_colorId_size_active_key";

ALTER TABLE "ProductSku" DROP CONSTRAINT IF EXISTS "ProductSku_colorId_fkey";

DROP INDEX IF EXISTS "ProductSku_colorId_idx";

ALTER TABLE "ProductSku" DROP COLUMN "colorId";
