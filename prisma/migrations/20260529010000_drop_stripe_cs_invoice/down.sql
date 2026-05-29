-- Rollback : ré-ajout des colonnes Stripe retirées + leurs index UNIQUE.
-- (Colonnes nullable sans backfill : aucune donnée à restaurer, elles n'étaient
--  jamais peuplées en production.)
ALTER TABLE "Order"
    ADD COLUMN "stripeCheckoutSessionId" TEXT,
    ADD COLUMN "stripeInvoiceId" TEXT;

CREATE UNIQUE INDEX "Order_stripeCheckoutSessionId_key" ON "Order"("stripeCheckoutSessionId");
CREATE UNIQUE INDEX "Order_stripeInvoiceId_key" ON "Order"("stripeInvoiceId");
