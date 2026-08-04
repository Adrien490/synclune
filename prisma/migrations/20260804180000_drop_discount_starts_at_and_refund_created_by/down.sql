-- Rollback : restaure la STRUCTURE des deux colonnes, pas leurs données.
--
-- `Discount.startsAt` revient avec son DEFAULT d'origine, donc les codes promo
-- existants se retrouvent tous « démarrés au moment du rollback ». C'est le bon
-- comportement par défaut — un code actif le reste — mais toute fenêtre de
-- planification saisie avant le DROP est perdue.
--
-- `Refund.createdBy` revient en TEXT nu, sans sa FK vers `User` : celle-ci
-- avait déjà été retirée au Lot 6 (20260803180000), le rollback de CETTE
-- migration ne doit donc pas la réintroduire. Les valeurs sont perdues, sans
-- conséquence comptable : la colonne n'avait aucun lecteur et l'auteur des
-- actions concernées reste tracé dans `OrderHistory.authorId`.

ALTER TABLE "Discount" ADD COLUMN "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Refund" ADD COLUMN "createdBy" TEXT;
