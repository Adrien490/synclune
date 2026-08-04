-- Rollback : réintroduit `Order.estimatedDelivery`.
--
-- Structurellement complet. Les données ne reviennent pas, mais elles sont
-- RECALCULABLES — c'est tout l'argument du retrait. Pour repeupler les commandes
-- déjà expédiées :
--
--   UPDATE "Order" SET "estimatedDelivery" = … -- estimateDeliveryDate(shippedAt, shippingCountry)
--   WHERE "shippedAt" IS NOT NULL;
--
-- (le calcul en jours OUVRÉS vit dans `shipping.service.ts`, pas en SQL — passer
-- par un script Node plutôt qu'une requête, sinon les week-ends sautent).
--
-- ⚠️ Recréer la colonne ne la fait pas re-remplir : `mark-as-shipped` n'écrit plus
-- dedans. Pour rétablir la persistance : `git revert` du commit applicatif.

ALTER TABLE "Order" ADD COLUMN "estimatedDelivery" TIMESTAMP(3);
