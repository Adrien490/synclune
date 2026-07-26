-- ============================================================================
-- Audit observabilité facturation - Conformité Art. 286 / 289-I / L102 B
-- Audit monitoring 2026-05-28 -- EINV-OPS-001 / EINV-OPS-002 / EINV-OPS-003 / EINV-OPS-004 / EINV-OPS-008
-- ============================================================================
--
-- Étend OrderAction enum avec 4 nouvelles actions traçables dans OrderHistory
-- (immuable, conservation 10 ans Art. L123-22) pour rendre visibles les échecs
-- comptables qui étaient silencieux (logger.error seul, pas d'alerte admin).
--
-- Ajoute sur Order :
--   - invoiceRetryDeferred : drapeau best-effort pour le cron reconcile-invoices
--     posé par ensure-invoice-number/archive/void quand l'opération échoue.
--   - invoiceReconcileAttempts : compteur des tentatives du cron — au-delà du
--     seuil l'admin reçoit une alerte d'escalade (intervention manuelle).
-- ============================================================================

-- Nouvelles valeurs OrderAction (immutable timeline visible dashboard admin).
-- INVOICE_GENERATION_FAILED / INVOICE_ARCHIVED ajoutes par migrations precedentes
-- (20260528120000_add_invoice_generation_failed_action / 20260528062038_*).
ALTER TYPE "OrderAction" ADD VALUE IF NOT EXISTS 'PDF_ARCHIVE_FAILED';
ALTER TYPE "OrderAction" ADD VALUE IF NOT EXISTS 'CREDIT_NOTE_FAILED';
ALTER TYPE "OrderAction" ADD VALUE IF NOT EXISTS 'INVOICE_RECONCILED';

-- Drapeau + compteur retry (consommés par cron reconcile-invoices)
ALTER TABLE "Order"
    ADD COLUMN "invoiceRetryDeferred"    BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "invoiceReconcileAttempts" INTEGER NOT NULL DEFAULT 0;

-- CHECK : compteur retry doit rester positif (préserve contre régressions)
ALTER TABLE "Order"
    ADD CONSTRAINT "Order_invoiceReconcileAttempts_check"
    CHECK ("invoiceReconcileAttempts" >= 0);

-- Index partiel : scan rapide des commandes à reconcilier (cron 1 fois/jour).
-- WHERE clause = uniquement les rows à traiter (la majorité écrasante ne
-- déclenche pas cet index). Évite un sequential scan sur Order entier.
CREATE INDEX "Order_invoiceRetryDeferred_idx"
    ON "Order" ("invoiceRetryDeferred", "paidAt")
    WHERE "invoiceRetryDeferred" = true;
