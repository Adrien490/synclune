-- Rollback du Lot 2 (audit schéma V4) : PK composite → clé surrogate.
--
-- Les `id` cuid2 d'origine sont perdus et régénérés en uuid : personne ne les
-- lisait, c'est précisément l'argument du retrait. Miroir exact du `down.sql` de
-- 20260805110000 pour `ProductSkuColor` / `ProductSkuMaterial`.

ALTER TABLE "ProductCollection" DROP CONSTRAINT "ProductCollection_pkey";
ALTER TABLE "ProductCollection" ADD COLUMN "id" TEXT;
UPDATE "ProductCollection" SET "id" = gen_random_uuid()::text WHERE "id" IS NULL;
ALTER TABLE "ProductCollection" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "ProductCollection" ADD CONSTRAINT "ProductCollection_pkey" PRIMARY KEY ("id");
CREATE UNIQUE INDEX "ProductCollection_productId_collectionId_key" ON "ProductCollection"("productId", "collectionId");
