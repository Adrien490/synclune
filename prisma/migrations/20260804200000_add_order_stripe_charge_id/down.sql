-- Rollback : retire la colonne et son index unique.
--
-- Aucune perte comptable. La colonne n'est ni une base de facturation ni une preuve :
-- l'identité fiscale de la facture vit dans `Order.invoiceDataSnapshot` (sous SHA-256)
-- et dans le PDF archivé, et le rendu PDF n'imprime PAS le `stripeChargeId` — un
-- rollback ne rend donc aucun document non reproductible.
--
-- Ce qui est perdu : le rattachement charge → commande sur les commandes encaissées
-- entre le déploiement et le rollback. Il reste reconstituable à tout moment depuis
-- l'API Stripe via `stripePaymentIntentId` (`PaymentIntent.latest_charge`), qui, lui,
-- survit au rollback.
--
-- L'index tombe avec la colonne (DROP COLUMN supprime les index qui la référencent) ;
-- le DROP INDEX explicite est là pour rendre le rollback lisible et rejouable même si
-- la colonne a déjà disparu par un autre chemin.

DROP INDEX IF EXISTS "Order_stripeChargeId_key";

ALTER TABLE "Order" DROP COLUMN IF EXISTS "stripeChargeId";
