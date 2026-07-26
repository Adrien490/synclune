-- Rollback : retrait des valeurs INVOICE_DOWNLOADED + BULK_EXPORT de OrderAction
--
-- ⚠️ Postgres ne supporte PAS le DROP VALUE sur un enum. Le rollback complet
-- requiert le workaround usuel (recréer le type sans les nouvelles valeurs,
-- migrer la colonne, drop l'ancien type). Inclus ci-dessous mais ne PAS
-- appliquer en prod sans backup PITR.
--
-- Préalable : aucune row OrderHistory.action ne doit valoir 'INVOICE_DOWNLOADED'
-- ni 'BULK_EXPORT' avant rollback. Faire un UPDATE/DELETE préalable si besoin.
--
--   UPDATE "OrderHistory" SET "action" = 'INVOICE_GENERATED'
--     WHERE "action" IN ('INVOICE_DOWNLOADED', 'BULK_EXPORT');
--
-- (ou DELETE selon politique audit-trail Art. L123-22 — préférer UPDATE)

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
    'INVOICE_RECONCILED'
);

ALTER TABLE "OrderHistory" ALTER COLUMN "action" TYPE "OrderAction"
    USING "action"::text::"OrderAction";

DROP TYPE "OrderAction_old";
