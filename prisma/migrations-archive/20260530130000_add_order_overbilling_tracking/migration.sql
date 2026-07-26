-- AM-2 : tracking sur-facturation (overbilling) — boucle de réconciliation fermée.
-- Quand Stripe encaisse PLUS que Order.total (amount_received > total), on persiste
-- le trop-perçu au lieu de seulement émettre un email volatil. Pas d'auto-refund
-- (Invariant 9 e-reporting) : remboursement manuel via le flux refund normal, le cron
-- alert-overbilled-orders ré-alerte et auto-résout quand les refunds couvrent le delta.

ALTER TABLE "Order" ADD COLUMN "overbilledAmountCents" INTEGER;
ALTER TABLE "Order" ADD COLUMN "overbillingResolvedAt" TIMESTAMP(3);

-- Index partiel : le cron ne scanne que les sur-facturations non résolues.
CREATE INDEX "Order_overbilling_unresolved_idx"
  ON "Order" ("overbillingResolvedAt", "overbilledAmountCents")
  WHERE "overbilledAmountCents" IS NOT NULL AND "overbillingResolvedAt" IS NULL;

-- Garde-fou : un trop-perçu enregistré est strictement positif.
ALTER TABLE "Order"
  ADD CONSTRAINT "Order_overbilledAmountCents_positive_check"
  CHECK ("overbilledAmountCents" IS NULL OR "overbilledAmountCents" > 0);
