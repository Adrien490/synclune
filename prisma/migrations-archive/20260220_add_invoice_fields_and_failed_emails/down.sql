-- Rollback : champs facturation initiaux sur Order + table FailedEmail
--
-- ATTENTION : ce down.sql ne retire PAS la valeur 'INVOICE_GENERATED' de l'enum
-- "OrderAction". Postgres ne supporte pas DROP VALUE et le recréer écraserait
-- les valeurs ajoutées par les migrations ultérieures (STATUS_REVERTED,
-- TRACKING_UPDATED, ADDRESS_UPDATED, INVOICE_VOIDED, etc.). Le rollback
-- accepte donc une valeur d'enum orpheline. Si rollback indispensable :
-- coordonner manuellement avec un script qui régénère l'enum dans son état
-- pré-migration ET supprime les OrderHistory.action IN ('INVOICE_GENERATED',
-- valeurs des migrations ultérieures).

DROP INDEX IF EXISTS "FailedEmail_status_createdAt_idx";
DROP INDEX IF EXISTS "Order_invoiceNumber_key";
DROP INDEX IF EXISTS "Order_stripeInvoiceId_key";

DROP TABLE IF EXISTS "FailedEmail";

ALTER TABLE "Order"
    DROP COLUMN IF EXISTS "invoiceGeneratedAt",
    DROP COLUMN IF EXISTS "invoiceStatus",
    DROP COLUMN IF EXISTS "invoiceNumber",
    DROP COLUMN IF EXISTS "stripeInvoiceId";

DROP TYPE IF EXISTS "InvoiceStatus";
DROP TYPE IF EXISTS "FailedEmailStatus";
