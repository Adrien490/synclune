-- ============================================================================
-- Audit trail : archivage PDF avoir
-- EINV audit 2026-05-29 (F2) — symetrie avec INVOICE_ARCHIVED
-- ============================================================================
--
-- `archiveCreditNotePdf()` faisait un `Order.update` nu, sans event
-- OrderHistory ni alerte admin en cas d'echec (contrairement a
-- `archiveInvoicePdf()` qui trace INVOICE_ARCHIVED + flag + alerte).
--
-- Cette valeur d'enum permet de tracer l'archivage immuable de l'avoir dans
-- l'audit trail L123-22 / Art. 272-I CGI (visibilite UI + retention 10 ans),
-- alignee sur le PDF facture.
-- ============================================================================

ALTER TYPE "OrderAction" ADD VALUE 'CREDIT_NOTE_ARCHIVED';
