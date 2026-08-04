-- Audit schéma V4, Lot 2 — `ProductCollection` passe en PK composite.
--
-- Même arbitrage que `ProductSkuColor` / `ProductSkuMaterial` (migration
-- 20260805110000) : la clé surrogate `id` n'était sélectionnée que par
-- `GET_COLLECTION_SELECT`, et son unique consommateur était une `key` React
-- remplaçable par `product.id`. Toutes les mutations passaient déjà par la clé
-- naturelle `where: { productId_collectionId: … }`.
--
-- `@@unique([productId, collectionId])` portait déjà l'identité de la ligne :
-- la promouvoir en PK retire une colonne ET un index.
--
-- ⚠️ `ProductCollection_collectionId_isFeatured_unique` (index UNIQUE PARTIEL sur
-- (collectionId) WHERE isFeatured = true, SSOT `prisma/sql/raw-guards.sql`) ne
-- référence PAS `id` : le `DROP COLUMN` ne l'emporte pas. Il n'est donc NI droppé
-- NI recréé ici — le toucher sortirait le garde de l'ensemble replié par le
-- contract test de parité, qui exige que les migrations embarquent l'intégralité
-- de la SSOT.
--
-- `ProductCollection_collectionId_idx` est conservé : il sert la cascade
-- `Collection onDelete: Cascade` et les lectures par collection, que la nouvelle
-- PK (préfixée `productId`) ne couvre pas.

ALTER TABLE "ProductCollection" DROP CONSTRAINT "ProductCollection_pkey";
DROP INDEX IF EXISTS "ProductCollection_productId_collectionId_key";
ALTER TABLE "ProductCollection" DROP COLUMN "id";
ALTER TABLE "ProductCollection" ADD CONSTRAINT "ProductCollection_pkey" PRIMARY KEY ("productId", "collectionId");
