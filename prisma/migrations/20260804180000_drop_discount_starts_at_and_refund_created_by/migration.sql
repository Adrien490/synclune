-- Deux colonnes retirées, pour deux raisons distinctes.
--
--  1. `Discount.startsAt` — la planification d'un code promo à l'avance était
--     portée par le cron `process-scheduled-discounts`, supprimé avec la vague
--     de dégraissage des crons (plan Vercel Hobby : un run/jour/cron). Ce cron
--     ne faisait que RECOPIER la fenêtre dans `isActive` ; l'enforcement réel
--     est resté synchrone, à la redemption du code. Décision (2026-08-04) :
--     l'activation différée devient MANUELLE — un code est utilisable dès sa
--     création, et se ferme soit à `endsAt` (conservé : une fermeture datée est
--     le seul mécanisme qui ne dépend pas d'un clic au bon moment), soit au
--     toggle `isActive`.
--     Le statut `scheduled` disparaît du même coup ; `expired` reste.
--
--  2. `Refund.createdBy` — colonne WRITE-ONLY. Deux écrivains (`cancel-order`,
--     `mark-as-fully-refunded`), zéro lecteur : elle n'était ni dans
--     `GET_REFUNDS_SELECT` ni dans `GET_REFUND_SELECT`. Depuis le passage aux
--     remboursements Stripe-first (Lot 2 S3.3), la ligne `Refund` naît le plus
--     souvent du webhook, où il n'y a pas d'auteur applicatif du tout. La trace
--     « qui a déclenché » vit dans `OrderHistory.authorId`, écrit par les deux
--     mêmes actions dans la même transaction. Sa FK vers `User` était déjà
--     tombée au Lot 6 (20260803180000) : la colonne n'est plus qu'un TEXT nu.

ALTER TABLE "Discount" DROP COLUMN "startsAt";

ALTER TABLE "Refund" DROP COLUMN "createdBy";
