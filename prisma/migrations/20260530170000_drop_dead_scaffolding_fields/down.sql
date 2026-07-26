-- Rollback — recrée les colonnes scaffolding supprimées (sans les index, déjà retirés
-- en 20260520160219). Restaure l'état immédiatement antérieur à cette migration.

ALTER TABLE "Cart" ADD COLUMN "abandonedEmailSentAt" TIMESTAMP(3);
ALTER TABLE "Cart" ADD COLUMN "guestEmail" VARCHAR(255);
ALTER TABLE "Cart" ADD COLUMN "guestPhone" VARCHAR(30);
ALTER TABLE "Cart" ADD COLUMN "marketingConsent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Cart" ADD COLUMN "guestContactAt" TIMESTAMP(3);

ALTER TABLE "Order" ADD COLUMN "reviewReminderSentAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "crossSellEmailSentAt" TIMESTAMP(3);
