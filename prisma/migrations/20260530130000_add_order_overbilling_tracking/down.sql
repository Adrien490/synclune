-- Rollback AM-2 : tracking sur-facturation.
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_overbilledAmountCents_positive_check";
DROP INDEX IF EXISTS "Order_overbilling_unresolved_idx";
ALTER TABLE "Order" DROP COLUMN IF EXISTS "overbillingResolvedAt";
ALTER TABLE "Order" DROP COLUMN IF EXISTS "overbilledAmountCents";
