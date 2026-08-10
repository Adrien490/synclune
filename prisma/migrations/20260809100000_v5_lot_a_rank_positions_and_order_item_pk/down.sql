-- Rollback du Lot A (audit schéma V5). Miroir exact, en ordre inverse.
--
-- ⚠️ Ce que le rollback NE restitue PAS, et qui est assumé :
--   - les `OrderItem.id` cuid2 d'origine (régénérés en uuid — personne ne les
--     lisait, c'est précisément l'argument du retrait, cf. le down.sql de
--     20260806100000 pour `ProductCollection`) ;
--   - la distinction entre « rang 0 par choix éditorial » et « rang 0 par défaut » :
--     le rang 0 de chaque groupe redevient le booléen, ce qui est exactement ce
--     que la migration aller avait replié. Un produit dont personne n'avait jamais
--     désigné de défaut se retrouve donc avec un `isDefault` sur sa variante la
--     plus ancienne — l'ordre est préservé, l'intention explicite ne l'est pas.

-- ============================================================================
-- A6 — `deliveredAt` → `actualDelivery`
-- ============================================================================
ALTER TABLE "Order" RENAME COLUMN "deliveredAt" TO "actualDelivery";


-- ============================================================================
-- A5 — PK composite → clé surrogate
-- ============================================================================
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_pkey";
ALTER TABLE "OrderItem" ADD COLUMN "id" TEXT;
UPDATE "OrderItem" SET "id" = gen_random_uuid()::text WHERE "id" IS NULL;
ALTER TABLE "OrderItem" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id");
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");


-- ============================================================================
-- A3 — `position` → `isFeatured`
-- ============================================================================
ALTER TABLE "ProductCollection" ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false;

WITH first_ranked AS (
	SELECT DISTINCT ON ("collectionId") "productId", "collectionId"
	FROM "ProductCollection"
	ORDER BY "collectionId", "position" ASC, "addedAt" DESC, "productId" ASC
)
UPDATE "ProductCollection" pc
SET "isFeatured" = true
FROM first_ranked f
WHERE pc."productId" = f."productId" AND pc."collectionId" = f."collectionId";

ALTER TABLE "ProductCollection" DROP COLUMN "position";

DROP INDEX IF EXISTS "ProductCollection_collectionId_isFeatured_unique";
CREATE UNIQUE INDEX "ProductCollection_collectionId_isFeatured_unique" ON "ProductCollection" ("collectionId") WHERE "isFeatured" = true;


-- ============================================================================
-- A2 — `position` → `isDefault`
-- ============================================================================
ALTER TABLE "ProductSku" ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;

-- Le `WHERE "deletedAt" IS NULL` est structurel : l'index unique partiel restauré
-- plus bas ne compte que les lignes vivantes, et promouvoir un SKU supprimé
-- laisserait le produit sans défaut visible.
WITH first_ranked AS (
	SELECT DISTINCT ON ("productId") "id"
	FROM "ProductSku"
	WHERE "deletedAt" IS NULL
	ORDER BY "productId", "position" ASC, "createdAt" ASC, "id" ASC
)
UPDATE "ProductSku" s
SET "isDefault" = true
FROM first_ranked f
WHERE s."id" = f."id";

DROP INDEX IF EXISTS "ProductSku_productId_position_idx";
ALTER TABLE "ProductSku" DROP COLUMN "position";
CREATE INDEX "ProductSku_productId_idx" ON "ProductSku"("productId");

DROP INDEX IF EXISTS "ProductSku_productId_isDefault_unique";
CREATE UNIQUE INDEX "ProductSku_productId_isDefault_unique" ON "ProductSku" ("productId") WHERE "isDefault" = true AND "deletedAt" IS NULL;


-- ============================================================================
-- A1 — rang 0 → `isPrimary`
-- ============================================================================
ALTER TABLE "SkuMedia" ADD COLUMN "isPrimary" BOOLEAN NOT NULL DEFAULT false;

WITH first_ranked AS (
	SELECT DISTINCT ON ("skuId") "id"
	FROM "SkuMedia"
	ORDER BY "skuId", "position" ASC, "id" ASC
)
UPDATE "SkuMedia" m
SET "isPrimary" = true
FROM first_ranked f
WHERE m."id" = f."id";

DROP INDEX IF EXISTS "SkuMedia_one_primary_per_sku";
CREATE UNIQUE INDEX "SkuMedia_one_primary_per_sku" ON "SkuMedia" ("skuId") WHERE "isPrimary" = true;


-- ============================================================================
-- A4 — `PublicationStatus` → `ProductStatus` + `CollectionStatus`
-- ============================================================================
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'PUBLIC', 'ARCHIVED');
CREATE TYPE "CollectionStatus" AS ENUM ('DRAFT', 'PUBLIC', 'ARCHIVED');

ALTER TABLE "Product" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Product" ALTER COLUMN "status" TYPE "ProductStatus" USING ("status"::text::"ProductStatus");
ALTER TABLE "Product" ALTER COLUMN "status" SET DEFAULT 'PUBLIC';

ALTER TABLE "Collection" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Collection" ALTER COLUMN "status" TYPE "CollectionStatus" USING ("status"::text::"CollectionStatus");
ALTER TABLE "Collection" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

DROP TYPE "PublicationStatus";
