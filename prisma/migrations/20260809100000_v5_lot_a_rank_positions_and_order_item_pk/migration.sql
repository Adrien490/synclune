-- Audit schéma V5, Lot A (docs/SIMPLIFICATION-V2.md § 4) — A1 à A6, sans A7.
--
-- Trois booléens de RANG (`SkuMedia.isPrimary`, `ProductSku.isDefault`,
-- `ProductCollection.isFeatured`) deviennent une colonne `position`, deux enums
-- de publication n'en font plus qu'un, `OrderItem` passe en PK composite et
-- `Order.actualDelivery` prend le nom de ses voisins.
--
-- Chaque booléen coûtait un index UNIQUE PARTIEL **et** une promotion
-- transactionnelle (celle de `set-featured-product` exigeait SERIALIZABLE) pour
-- exprimer « celui-là d'abord » — ce qu'un entier dit sans contrainte à tenir.
--
-- ⚠️ A7 (`StoreSettings.closedAt` / `closedBy`) n'est PAS ici : la proposition les
-- disait write-only, ils sont lus et rendus par `store-settings-form.tsx`.
--
-- ⚠️ M7 (renommage de `StoreSettings.id`) n'est PAS ici non plus : il ne figure pas
-- dans la liste A1→A6, et renommer la PK d'un singleton n'apporte rien qu'un
-- risque de production. M6 est un non-événement — la proposition faisait passer
-- `ProductSku_compareAtPrice_valid` de `>=` à `>`, on garde `>=`.

-- ============================================================================
-- GARDE PRÉ-VOL — A5 exige l'unicité de (orderId, skuId), jamais imposée en base
-- ============================================================================
-- `OrderItem` n'a aujourd'hui aucune contrainte d'unicité sur ce couple : la
-- consolidation par SKU est faite CÔTÉ PANIER (`addCartItem` cherche la ligne
-- existante), donc rien ne prouve qu'aucune commande historique ne porte deux
-- lignes du même SKU. Sans cette garde, l'échec serait une violation de contrainte
-- brute au milieu d'un `migrate deploy` de production.
DO $$
DECLARE
	duplicate_pairs INTEGER;
BEGIN
	SELECT COUNT(*) INTO duplicate_pairs FROM (
		SELECT 1 FROM "OrderItem" GROUP BY "orderId", "skuId" HAVING COUNT(*) > 1
	) AS d;

	IF duplicate_pairs > 0 THEN
		RAISE EXCEPTION
			'Lot A5 impossible : % couple(s) (orderId, skuId) en double dans OrderItem. Consolider les lignes (somme des quantity, price identique) AVANT de rejouer cette migration.',
			duplicate_pairs;
	END IF;
END $$;


-- ============================================================================
-- A4 — `ProductStatus` + `CollectionStatus` → `PublicationStatus`
-- ============================================================================
-- Mêmes membres, même ordre, même sémantique. La machine à états reste par
-- entité : `product-status-validation.service.ts` garde ses règles de publication
-- (titre + SKU actif en stock + média IMAGE), qu'une collection n'a pas.
CREATE TYPE "PublicationStatus" AS ENUM ('DRAFT', 'PUBLIC', 'ARCHIVED');

ALTER TABLE "Product" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Product" ALTER COLUMN "status" TYPE "PublicationStatus" USING ("status"::text::"PublicationStatus");
ALTER TABLE "Product" ALTER COLUMN "status" SET DEFAULT 'PUBLIC';

ALTER TABLE "Collection" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Collection" ALTER COLUMN "status" TYPE "PublicationStatus" USING ("status"::text::"PublicationStatus");
ALTER TABLE "Collection" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

DROP TYPE "ProductStatus";
DROP TYPE "CollectionStatus";


-- ============================================================================
-- A1 — `SkuMedia.isPrimary` → rang 0 de `(position asc, id asc)`
-- ============================================================================
-- Renumérotation AVANT le DROP : elle replie l'ordre canonique historique
-- (`isPrimary desc, position asc, id asc`) en positions contiguës, de sorte que
-- le média principal de chaque SKU devienne exactement le rang 0. Sans elle, le
-- choix éditorial de Léane sur chaque bijou serait perdu en silence.
WITH ranked AS (
	SELECT
		"id",
		(ROW_NUMBER() OVER (
			PARTITION BY "skuId"
			ORDER BY "isPrimary" DESC, "position" ASC, "id" ASC
		) - 1) AS new_position
	FROM "SkuMedia"
)
UPDATE "SkuMedia" m
SET "position" = r.new_position
FROM ranked r
WHERE m."id" = r."id";

DROP INDEX IF EXISTS "SkuMedia_one_primary_per_sku";
ALTER TABLE "SkuMedia" DROP COLUMN "isPrimary";


-- ============================================================================
-- A2 — `ProductSku.isDefault` → `position`
-- ============================================================================
-- `ProductSku` n'avait AUCUNE colonne d'ordre (contrairement à `SkuMedia`,
-- `ProductSkuColor`, `ProductSkuMaterial`) : `position` est créée ici, pas
-- recyclée. Le tri de repli est `createdAt` — c'est déjà celui que
-- `delete-sku.ts` utilisait pour promouvoir un nouveau défaut.
ALTER TABLE "ProductSku" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;

WITH ranked AS (
	SELECT
		"id",
		(ROW_NUMBER() OVER (
			PARTITION BY "productId"
			ORDER BY "isDefault" DESC, "createdAt" ASC, "id" ASC
		) - 1) AS new_position
	FROM "ProductSku"
)
UPDATE "ProductSku" s
SET "position" = r.new_position
FROM ranked r
WHERE s."id" = r."id";

DROP INDEX IF EXISTS "ProductSku_productId_isDefault_unique";
ALTER TABLE "ProductSku" DROP COLUMN "isDefault";

-- `[productId]` → `[productId, position]` : l'ordre des variantes devient une
-- lecture chaude (liste admin, sélecteur de SKU, PDP), et le préfixe `productId`
-- reste servi par le même index.
DROP INDEX IF EXISTS "ProductSku_productId_idx";
CREATE INDEX "ProductSku_productId_position_idx" ON "ProductSku"("productId", "position");


-- ============================================================================
-- A3 — `ProductCollection.isFeatured` → `position`
-- ============================================================================
-- Le repli est `addedAt DESC` : c'est le second critère de l'ordre canonique
-- historique (`isFeatured desc, addedAt desc`), donc le produit vedette devient
-- le rang 0 et les autres conservent leur ordre d'affichage exact.
ALTER TABLE "ProductCollection" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;

WITH ranked AS (
	SELECT
		"productId",
		"collectionId",
		(ROW_NUMBER() OVER (
			PARTITION BY "collectionId"
			ORDER BY "isFeatured" DESC, "addedAt" DESC, "productId" ASC
		) - 1) AS new_position
	FROM "ProductCollection"
)
UPDATE "ProductCollection" pc
SET "position" = r.new_position
FROM ranked r
WHERE pc."productId" = r."productId" AND pc."collectionId" = r."collectionId";

DROP INDEX IF EXISTS "ProductCollection_collectionId_isFeatured_unique";
ALTER TABLE "ProductCollection" DROP COLUMN "isFeatured";


-- ============================================================================
-- A5 — `OrderItem` : clé surrogate → PK composite `(orderId, skuId)`
-- ============================================================================
-- Même arbitrage que `ProductCollection` (20260806100000) et
-- `ProductSkuColor`/`ProductSkuMaterial` (20260805110000) : `id` n'identifiait
-- rien de plus que le couple, et son unique consommateur était une `key` React.
-- `OrderItem_orderId_idx` est retiré : le préfixe de la nouvelle PK le couvre.
-- `OrderItem_skuId_idx` reste — c'est lui que consulte le contrôle d'intégrité
-- d'`onDelete: Restrict` à chaque suppression de SKU.
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_pkey";
DROP INDEX IF EXISTS "OrderItem_orderId_idx";
ALTER TABLE "OrderItem" DROP COLUMN "id";
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("orderId", "skuId");


-- ============================================================================
-- A6 — `Order.actualDelivery` → `deliveredAt`
-- ============================================================================
-- Nommage cohérent avec `shippedAt` / `paidAt`. ⚠️ Champ à conséquence légale :
-- c'est l'ancre du délai de rétractation (`return-eligibility.service.ts`).
-- Aucun index ne le référence.
ALTER TABLE "Order" RENAME COLUMN "actualDelivery" TO "deliveredAt";
