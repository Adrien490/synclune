-- Rollback : réintroduit les 6 valeurs de plomberie dans `OrderAction`.
--
-- Structurellement complet et SANS perte : recréer une valeur d'enum est
-- réversible, et aucune ligne d'`OrderHistory` ne les portait au moment du retrait
-- (c'est la précondition vérifiée par la migration montante).
--
-- ⚠️ Recréer les valeurs NE RÉTABLIT PAS les écritures : les 6 appels
-- `createOrderAudit(Tx)` correspondants sont partis du CODE au même lot
-- (`archive-invoice-pdf`, `archive-credit-note-pdf` ×2, `ensure-invoice-number`,
-- `void-invoice`, `reconcile-invoices`), ainsi que leurs entrées de configuration
-- dans `order-history-timeline.tsx`. Un rollback DB seul laisserait six valeurs
-- sans écrivain — inoffensif, mais inutile. Pour les rétablir : `git revert` du
-- commit applicatif.

ALTER TYPE "OrderAction" ADD VALUE IF NOT EXISTS 'INVOICE_GENERATION_FAILED';
ALTER TYPE "OrderAction" ADD VALUE IF NOT EXISTS 'INVOICE_ARCHIVED';
ALTER TYPE "OrderAction" ADD VALUE IF NOT EXISTS 'PDF_ARCHIVE_FAILED';
ALTER TYPE "OrderAction" ADD VALUE IF NOT EXISTS 'CREDIT_NOTE_FAILED';
ALTER TYPE "OrderAction" ADD VALUE IF NOT EXISTS 'CREDIT_NOTE_ARCHIVED';
ALTER TYPE "OrderAction" ADD VALUE IF NOT EXISTS 'INVOICE_RECONCILED';
