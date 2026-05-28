-- Rollback : retrait de CREDIT_NOTE_GENERATED de OrderAction
--
-- WARNING : Postgres ne supporte PAS le DROP VALUE sur un enum. Le rollback
-- complet requiert le workaround usuel (recréer le type sans la nouvelle
-- valeur, migrer la colonne, drop l'ancien type). Inclus ci-dessous mais ne
-- PAS appliquer en prod sans backup PITR.
--
-- Préalable : aucune row OrderHistory.action ne doit valoir
-- 'CREDIT_NOTE_GENERATED' avant rollback. Faire un UPDATE préalable :
--
--   UPDATE "OrderHistory" SET "action" = 'INVOICE_VOIDED'
--     WHERE "action" = 'CREDIT_NOTE_GENERATED';
--
-- (préférer UPDATE à DELETE — politique audit-trail immuable Art. L123-22)

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

ALTER TABLE "OrderHistory" ALTER COLUMN "action" TYPE "OrderAction"
    USING "action"::text::"OrderAction";

DROP TYPE "OrderAction_old";
