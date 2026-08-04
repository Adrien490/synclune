-- Lot 2 de l'audit schéma V2 (2026-08-05) — repli de `DiscountUsage` en deux
-- colonnes sur `Order`.
--
-- POURQUOI. `DiscountUsage` était une table à UNE ligne maximum par commande : le
-- cookie panier porte un `discountCode` SINGULIER (`modules/cart/lib/cart-cookie.ts`)
-- et `order-creation.service.ts` n'en créait jamais qu'une, sous
-- `if (appliedDiscountId && discountAmount > 0)`. Elle coûtait un modèle, une
-- relation, et un join dans chaque select de commande — pour porter deux scalaires.
--
-- `discountCode` suit la doctrine de snapshot d'`OrderItem.productTitle` : figé au
-- checkout, il survit au renommage comme à la suppression du code.
--
-- ⚠️ L'ORDRE COMPTE : le backfill doit lire `DiscountUsage` AVANT son DROP.
--
-- ⚠️ `ON DELETE RESTRICT` et non `SET NULL` : c'est cette clause qui préserve la
-- garde « un code déjà utilisé ne se supprime pas », que la FK de `DiscountUsage`
-- portait et sur laquelle s'appuie l'UI (`use-discount-actions.ts`).
--
-- Pas d'index sur `Order."discountId"` : `Order` atteint ~2 400 lignes au bout de
-- DIX ANS à 20 commandes/mois — cohérent avec l'arbitrage d'index documenté sur ce
-- modèle (audit V1, 10 index composites → 5). La vérification de RESTRICT et le
-- comptage `maxUsagePerUser` parcourent ça en moins d'une milliseconde.

-- ---------------------------------------------------------------------------
-- 1. Colonnes
-- ---------------------------------------------------------------------------
ALTER TABLE "Order" ADD COLUMN "discountCode" VARCHAR(30);
ALTER TABLE "Order" ADD COLUMN "discountId" TEXT;

-- ---------------------------------------------------------------------------
-- 2. Backfill — AVANT le DROP TABLE
-- ---------------------------------------------------------------------------
-- `DISTINCT ON` : le schéma autorisait `@@unique([discountId, orderId])`, donc
-- plusieurs codes DIFFÉRENTS sur une même commande. Le code ne l'a jamais produit,
-- mais la contrainte ne l'interdisait pas — on prend la ligne déterministe la plus
-- basse plutôt que de laisser Postgres choisir, ou de faire échouer la migration.
UPDATE "Order" o
SET "discountId" = du."discountId",
    "discountCode" = du."discountCode"
FROM (
  SELECT DISTINCT ON ("orderId") "orderId", "discountId", "discountCode"
  FROM "DiscountUsage"
  ORDER BY "orderId", "discountId"
) du
WHERE du."orderId" = o.id;

-- ---------------------------------------------------------------------------
-- 3. FK, puis DROP de la table
-- ---------------------------------------------------------------------------
ALTER TABLE "Order" ADD CONSTRAINT "Order_discountId_fkey"
  FOREIGN KEY ("discountId") REFERENCES "Discount"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

DROP TABLE "DiscountUsage";
