-- Rollback du Lot 2 de l'audit schéma V2 (2026-08-05).
--
-- Celui-ci restitue les DONNÉES, contrairement aux autres down.sql de la série :
-- `DiscountUsage` était une projection stricte de ce qui vit désormais en colonnes
-- sur `Order`, donc la table se reconstruit intégralement depuis elles.
--
-- Seule perte possible : une commande qui aurait porté PLUSIEURS codes distincts
-- avant le repli n'en retrouve qu'un (le backfill n'en avait gardé qu'un, cf.
-- `DISTINCT ON` dans la migration montante). Aucune ligne de ce genre n'a jamais
-- été produite par le code — le cookie panier ne porte qu'un `discountCode`.

-- ---------------------------------------------------------------------------
-- 1. Table + index + FK
-- ---------------------------------------------------------------------------
CREATE TABLE "DiscountUsage" (
    "id" TEXT NOT NULL,
    "discountId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "discountCode" VARCHAR(30) NOT NULL,

    CONSTRAINT "DiscountUsage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DiscountUsage_discountId_orderId_key" ON "DiscountUsage"("discountId", "orderId");
CREATE INDEX "DiscountUsage_orderId_idx" ON "DiscountUsage"("orderId");

ALTER TABLE "DiscountUsage" ADD CONSTRAINT "DiscountUsage_discountId_fkey" FOREIGN KEY ("discountId") REFERENCES "Discount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiscountUsage" ADD CONSTRAINT "DiscountUsage_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- 2. Restitution des lignes depuis les colonnes d'`Order`
-- ---------------------------------------------------------------------------
-- `gen_random_uuid()` : l'id d'origine (cuid2) est définitivement perdu, mais il
-- n'était sélectionné nulle part — seuls `discountId`/`orderId`/`discountCode`
-- étaient lus. La fonction est dans le CŒUR de Postgres depuis la 13, donc sans
-- extension : `prisma/sql/raw-guards.sql` n'installe que `pg_trgm` et `unaccent`,
-- pas `pgcrypto`.
INSERT INTO "DiscountUsage" ("id", "discountId", "orderId", "discountCode")
SELECT gen_random_uuid()::text, o."discountId", o.id, o."discountCode"
FROM "Order" o
WHERE o."discountId" IS NOT NULL AND o."discountCode" IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. Colonnes d'`Order`
-- ---------------------------------------------------------------------------
ALTER TABLE "Order" DROP CONSTRAINT "Order_discountId_fkey";
ALTER TABLE "Order" DROP COLUMN "discountId";
ALTER TABLE "Order" DROP COLUMN "discountCode";
