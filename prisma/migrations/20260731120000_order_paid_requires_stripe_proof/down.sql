-- Rollback de `20260731120000_order_paid_requires_stripe_proof`.
--
-- Non destructif : retire deux CHECK, aucune donnée n'est touchée. Rejouer la
-- migration après coup ne nécessite aucune préparation tant qu'aucune ligne
-- (PAID, stripePaymentIntentId NULL, piiPurgedAt NULL) n'a été écrite entre-temps
-- — ce qui est précisément ce que ces contraintes empêchent.
--
-- ⚠️ Les retirer rouvre le vecteur « SQL manuel / script bugué » de l'invariant
-- #8 (NF 525) : à ne faire que pour débloquer un incident de déploiement, pas
-- comme état durable.

ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_paid_requires_stripe_proof";
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_paid_requires_paidAt";
