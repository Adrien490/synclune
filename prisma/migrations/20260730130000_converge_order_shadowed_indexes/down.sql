-- Rollback : restaure les versions PARTIELLES des 4 index d'`Order`.
--
-- État d'avant la migration, tel que l'annexe de `0_init` le produisait. Aucune perte
-- de données possible dans un sens comme dans l'autre (des index, pas des contraintes).
-- Si ce rollback est joué, penser à remettre les 4 paires DROP/CREATE dans
-- `prisma/sql/raw-guards.sql` — sinon le prochain `db push` + application de la SSOT
-- (setup d'intégration) reproduira les versions complètes et la base divergera à
-- nouveau de la SSOT.

DROP INDEX IF EXISTS "Order_invoiceRetryDeferred_idx";
CREATE INDEX "Order_invoiceRetryDeferred_idx" ON "Order" ("invoiceRetryDeferred", "paidAt") WHERE "invoiceRetryDeferred" = true;

DROP INDEX IF EXISTS "Order_piiPurgedAt_paidAt_idx";
CREATE INDEX "Order_piiPurgedAt_paidAt_idx" ON "Order" ("piiPurgedAt", "paidAt") WHERE "piiPurgedAt" IS NULL;

DROP INDEX IF EXISTS "Order_unpaid_pii_purge_idx";
CREATE INDEX "Order_unpaid_pii_purge_idx" ON "Order" ("piiPurgedAt", "paidAt", "createdAt") WHERE "piiPurgedAt" IS NULL AND "paidAt" IS NULL;

DROP INDEX IF EXISTS "Order_overbilling_unresolved_idx";
CREATE INDEX "Order_overbilling_unresolved_idx" ON "Order" ("overbillingResolvedAt", "overbilledAmountCents") WHERE "overbilledAmountCents" IS NOT NULL AND "overbillingResolvedAt" IS NULL;
