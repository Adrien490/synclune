-- ============================================================================
-- Audit trail : echec generation facture
-- EINV-UI-004 (audit UI admin facturation 2026-05-28)
-- ============================================================================
--
-- Avant cette migration, quand `persistInvoiceNumber()` ou
-- `archiveInvoicePdf()` echouait (advisory lock conflict, UploadThing fetch
-- ko, race condition webhook), un email `ADMIN_INVOICE_FAILED_ALERT` etait
-- envoye mais aucun event `OrderHistory` n'etait cree. L'admin recevait un
-- email puis ne retrouvait plus rien dans l'historique de la commande.
--
-- Cette nouvelle valeur d'enum permet de tracer l'echec dans l'audit trail
-- L123-22 / Art. 286 CGI (visibilite UI + retention 10 ans).
-- ============================================================================

ALTER TYPE "OrderAction" ADD VALUE 'INVOICE_GENERATION_FAILED';
