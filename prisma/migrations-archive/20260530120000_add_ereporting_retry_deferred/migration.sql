-- EINV-EREPORT-009 — DLQ e-reporting (audit 2026-05-30)
--
-- Filet anti-trou symétrique au DLQ facture (invoiceRetryDeferred) : un échec
-- transitoire de recordSalesEReporting / recordRefundEReporting était avalé
-- ("error" sans throw) et l'event webhook marqué COMPLETED → Stripe ne rejouait
-- pas → la transaction DGFiP manquante n'était jamais rattrapée (sous-déclaration
-- silencieuse Art. 286 CGI). Le contrôle de continuité de période ne détecte que
-- les transactions créées-mais-non-batchées, pas les jamais-créées.
--
-- Order.ereportingRetryDeferred  : consommé par reconcile-invoices (Passe SALES).
-- Refund.ereportingRetryDeferred : consommé par reconcile-refunds (rattrapage REFUND).

ALTER TABLE "Order" ADD COLUMN "ereportingRetryDeferred" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Refund" ADD COLUMN "ereportingRetryDeferred" BOOLEAN NOT NULL DEFAULT false;

-- Index pour les scans crons (WHERE ereportingRetryDeferred = true). Cas nominal :
-- 0 ligne flaguée → index minuscule.
CREATE INDEX "Order_ereportingRetryDeferred_idx" ON "Order" ("ereportingRetryDeferred", "paidAt");
CREATE INDEX "Refund_ereportingRetryDeferred_idx" ON "Refund" ("ereportingRetryDeferred", "processedAt");
