-- Schema Audit 2026-04-17: DB-level constraints for business rules previously enforced app-side only
-- Goal: Move from 9.4/10 to 10/10 by adding defense-in-depth at the database layer

-- ============================================================================
-- 1. ProductSku.isDefault - Garantir un seul SKU par defaut par produit
-- ============================================================================
-- Avant: regle metier appliquee uniquement par transaction applicative (setDefaultSku.ts).
-- Apres: contrainte DB partielle (active SKUs uniquement, soft-delete-aware).

-- Cleanup defensif: si plusieurs defaults existent par produit, garder le plus recent
WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (PARTITION BY "productId" ORDER BY "updatedAt" DESC) as rn
  FROM "ProductSku"
  WHERE "isDefault" = true AND "deletedAt" IS NULL
)
UPDATE "ProductSku"
SET "isDefault" = false
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

CREATE UNIQUE INDEX "ProductSku_productId_isDefault_unique"
  ON "ProductSku" ("productId")
  WHERE "isDefault" = true AND "deletedAt" IS NULL;

-- ============================================================================
-- 2. ProductCollection.isFeatured - Garantir un seul produit featured par collection
-- ============================================================================
-- Avant: regle metier appliquee uniquement par transaction applicative (setFeaturedProduct.ts).
-- Apres: contrainte DB partielle.

WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (PARTITION BY "collectionId" ORDER BY "updatedAt" DESC) as rn
  FROM "ProductCollection"
  WHERE "isFeatured" = true
)
UPDATE "ProductCollection"
SET "isFeatured" = false
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

CREATE UNIQUE INDEX "ProductCollection_collectionId_isFeatured_unique"
  ON "ProductCollection" ("collectionId")
  WHERE "isFeatured" = true;

-- ============================================================================
-- 3. StoreSettings - Forcer le singleton au niveau DB
-- ============================================================================
-- Avant: singleton garanti par convention (ID fixe dans constants/cache.ts).
-- Apres: CHECK constraint empeche toute insertion d'une 2e ligne avec un autre ID.

ALTER TABLE "StoreSettings"
  ADD CONSTRAINT "StoreSettings_singleton_id"
  CHECK (id = 'store-settings-singleton');
