-- Rollback : retrait valeur CREDIT_NOTE_ARCHIVED
--
-- Postgres ne supporte pas DROP VALUE sur ENUM directement. Strategie :
--   1. Sauver les rows OrderHistory referencant la valeur (sinon perte audit)
--   2. Renommer l'enum, recreer sans la valeur, re-typer la colonne, drop ancien
--
-- En pratique, ce rollback ne doit etre execute que si aucun OrderHistory
-- n'a encore utilise CREDIT_NOTE_ARCHIVED (sinon perte donnees).
-- Verifier avant exec :
--   SELECT COUNT(*) FROM "OrderHistory" WHERE action = 'CREDIT_NOTE_ARCHIVED';
-- Si > 0, ne pas rollback — investiguer la cause.

ALTER TYPE "OrderAction" RENAME TO "OrderAction_old";

CREATE TYPE "OrderAction" AS ENUM (
    'CREATED',
    'PAID',
    'PROCESSING',
    'SHIPPED',
    'DELIVERED',
    'CANCELLED',
    'RETURNED',
    'STATUS_REVERTED',
    'TRACKING_UPDATED',
    'ADDRESS_UPDATED',
    'INVOICE_GENERATED',
    'INVOICE_GENERATION_FAILED',
    'REFUND_CREATED',
    'REFUND_COMPLETED',
    'REFUND_FAILED',
    'DISPUTE_OPENED',
    'DISPUTE_RESOLVED',
    'INVOICE_VOIDED',
    'INVOICE_ARCHIVED',
    'PDF_ARCHIVE_FAILED',
    'CREDIT_NOTE_FAILED',
    'CREDIT_NOTE_GENERATED',
    'INVOICE_RECONCILED',
    'INVOICE_DOWNLOADED',
    'BULK_EXPORT',
    'PDP_SUBMITTED',
    'PDP_ACCEPTED',
    'PDP_REJECTED',
    'PDP_RETRY',
    'PDP_ABANDONED',
    'PDP_CANCELLED'
);

ALTER TABLE "OrderHistory"
    ALTER COLUMN "action" TYPE "OrderAction"
    USING ("action"::text::"OrderAction");

DROP TYPE "OrderAction_old";
