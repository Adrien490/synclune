-- Audit right-sizing — suppression du scaffolding mort (jamais peuplé en production).
--   Cart   : relance panier abandonné + capture contact guest (aucun cron, aucun call site).
--   Order  : cross-sell + rappel d'avis (crons retirés en avril 2026).
-- Les index composites associés ont déjà été retirés (migration 20260520160219_schema_index_hygiene).
-- Aucune donnée métier perdue : ces colonnes n'ont jamais été écrites hors seed de dev.

ALTER TABLE "Cart" DROP COLUMN "abandonedEmailSentAt";
ALTER TABLE "Cart" DROP COLUMN "guestEmail";
ALTER TABLE "Cart" DROP COLUMN "guestPhone";
ALTER TABLE "Cart" DROP COLUMN "marketingConsent";
ALTER TABLE "Cart" DROP COLUMN "guestContactAt";

ALTER TABLE "Order" DROP COLUMN "reviewReminderSentAt";
ALTER TABLE "Order" DROP COLUMN "crossSellEmailSentAt";
