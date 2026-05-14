-- ============================================================================
-- M2M Sku <-> Material : permettre plusieurs matériaux par variante (bague verre + acier, etc.)
-- - Ajoute la table de jointure ProductSkuMaterial (avec ordre = priorité via `position`)
-- - Backfille depuis l'ancien `ProductSku.materialId` (1 ligne par SKU non-null, position=0)
-- - Drop l'ancien FK + colonne + index
-- - Adapte l'index unique partiel : retire `materialId` (la variant-identity devient color × size,
--   les matériaux deviennent descriptifs côté SKU)
-- Plan : /Users/adrienpoirier/.claude/plans/si-tu-as-fancy-kettle.md (Plan Mode 2026-05-14)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Création de la table de jointure
-- ----------------------------------------------------------------------------
CREATE TABLE "ProductSkuMaterial" (
    "id" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductSkuMaterial_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductSkuMaterial_skuId_materialId_key"
    ON "ProductSkuMaterial"("skuId", "materialId");

CREATE INDEX "ProductSkuMaterial_materialId_idx"
    ON "ProductSkuMaterial"("materialId");

CREATE INDEX "ProductSkuMaterial_skuId_position_idx"
    ON "ProductSkuMaterial"("skuId", "position");

ALTER TABLE "ProductSkuMaterial"
    ADD CONSTRAINT "ProductSkuMaterial_skuId_fkey"
    FOREIGN KEY ("skuId") REFERENCES "ProductSku"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductSkuMaterial"
    ADD CONSTRAINT "ProductSkuMaterial_materialId_fkey"
    FOREIGN KEY ("materialId") REFERENCES "Material"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------------------------------------------------------
-- 2. Backfill depuis l'ancien `ProductSku.materialId`
--    gen_random_uuid() est disponible sans extension sur Postgres >= 13 (Neon OK).
--    Les IDs ne sont pas exposés publiquement → mélange UUID/CUID acceptable.
-- ----------------------------------------------------------------------------
INSERT INTO "ProductSkuMaterial" ("id", "skuId", "materialId", "position", "addedAt", "createdAt", "updatedAt")
SELECT
    'csm_' || replace(gen_random_uuid()::text, '-', ''),
    "id",
    "materialId",
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "ProductSku"
WHERE "materialId" IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 3. Garde-fou : détecter les doublons (productId, colorId, size) actifs avant
--    de retirer materialId de l'index. En cas de collision la migration échoue
--    pour qu'on règle le conflit manuellement (mais on a alors a un vrai problème
--    de catalogue à résoudre côté admin).
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    duplicate_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT "productId", "colorId", "size", COUNT(*) AS c
        FROM "ProductSku"
        WHERE "deletedAt" IS NULL
        GROUP BY "productId", "colorId", "size"
        HAVING COUNT(*) > 1
    ) dups;

    IF duplicate_count > 0 THEN
        RAISE EXCEPTION 'Collision detected: % active SKU groupings share the same (productId, colorId, size). Resolve duplicates before applying this migration (likely two SKUs that previously differed only by materialId).', duplicate_count;
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 4. Drop de l'ancien index unique partiel + FK + colonne + index FK
-- ----------------------------------------------------------------------------
DROP INDEX IF EXISTS "ProductSku_productId_colorId_size_materialId_active_key";

ALTER TABLE "ProductSku" DROP CONSTRAINT IF EXISTS "ProductSku_materialId_fkey";

DROP INDEX IF EXISTS "ProductSku_materialId_idx";

ALTER TABLE "ProductSku" DROP COLUMN "materialId";

-- ----------------------------------------------------------------------------
-- 5. Recréation de l'index unique partiel sans materialId
-- ----------------------------------------------------------------------------
CREATE UNIQUE INDEX "ProductSku_productId_colorId_size_active_key"
    ON "ProductSku" ("productId", "colorId", "size")
    WHERE "deletedAt" IS NULL;
