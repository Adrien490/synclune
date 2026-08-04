-- Retrait des codes promo (2026-08-05).
--
-- Une micro-entreprise à ~20 commandes/mois n'a pas de programme promotionnel à
-- piloter : le moteur de codes pesait un modèle, un enum, 3 colonnes sur `Order`,
-- 7 CHECK, et 100 fichiers applicatifs (~14 200 lignes) — éligibilité, plafonds
-- d'usage global et par email, exclusion des articles soldés, décrément
-- transactionnel sous le lock de stock, libération au rollback de checkout, à
-- l'annulation, à l'échec de paiement et à la purge des paniers abandonnés.
--
-- La remise reste possible sans rien de tout ça : `ProductSku.compareAtPrice` est
-- déjà en place et affiche un prix barré.
--
-- ⚠️ CE QUI DOIT REVENIR AVEC EUX, si les codes promo sont réintroduits — ce n'est
-- pas une colonne de montant qu'il faut recréer, c'est le TRIO qui les rendait
-- auditables :
--   1. `Order.discountCode`, SNAPSHOT figé au checkout (même doctrine que
--      `OrderItem.productTitle`) : il survit au renommage comme à la suppression
--      du code, sans quoi une facture de dix ans cesse d'être reconstituable ;
--   2. `onDelete: Restrict` sur la relation, seule garde « un code déjà utilisé ne
--      se supprime pas » depuis le retrait de `DiscountUsage` (audit V2, Lot 2) ;
--   3. le décrément de `usageCount` DANS la transaction de création de commande,
--      gardé par `usageCount > 0` et par `usageCount < maxUsageCount` en SQL brut —
--      un `update` applicatif laisse passer le dépassement en concurrence.
--
-- `Order_total_formula` est RÉÉCRIT, pas supprimé : la formule perd son terme de
-- remise mais continue de verrouiller la cohérence du total.

-- 1. Colonnes de commande (la relation part avec `discountId`)
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_discountId_fkey";
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_discountAmount_non_negative";

ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_total_formula";
ALTER TABLE "Order" ADD CONSTRAINT "Order_total_formula" CHECK ("total" = GREATEST(0, "subtotal" + "shippingCost"));

ALTER TABLE "Order" DROP COLUMN "discountCode";
ALTER TABLE "Order" DROP COLUMN "discountId";
ALTER TABLE "Order" DROP COLUMN "discountAmount";

-- 2. Le modèle et son enum
DROP TABLE "Discount";
DROP TYPE "DiscountType";
