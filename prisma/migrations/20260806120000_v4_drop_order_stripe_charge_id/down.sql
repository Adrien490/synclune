-- Rollback du Lot 4 (audit schéma V4) : réintroduit `Order.stripeChargeId` et son
-- index unique. Miroir exact de la migration 20260804200000.
--
-- Nullable et SANS backfill, comme à l'ajout d'origine : les commandes encaissées
-- entre le drop et le rollback restent à NULL. C'est exact — l'information n'a pas
-- été captée pour elles. Elle est récupérable par script depuis l'API Stripe :
-- `stripePaymentIntentId` → `PaymentIntent.latest_charge`.
--
-- ⚠️ Recréer la colonne ne la fait pas re-remplir : `processOrderFromPaymentIntent`
-- n'écrit plus dedans. Pour rétablir la persistance, `git revert` du commit
-- applicatif.

ALTER TABLE "Order" ADD COLUMN "stripeChargeId" TEXT;
CREATE UNIQUE INDEX "Order_stripeChargeId_key" ON "Order"("stripeChargeId");
