-- Rollback : audit observabilité facturation
-- Note : ALTER TYPE ... DROP VALUE n'est pas supporté par Postgres. Les
-- valeurs ajoutées à OrderAction restent (acceptable : enum élargi est
-- backward-compatible, anciennes versions code ignorent simplement les
-- nouvelles actions dans OrderHistory).

DROP INDEX IF EXISTS "Order_invoiceRetryDeferred_idx";
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_invoiceReconcileAttempts_check";
ALTER TABLE "Order"
    DROP COLUMN IF EXISTS "invoiceReconcileAttempts",
    DROP COLUMN IF EXISTS "invoiceRetryDeferred";
