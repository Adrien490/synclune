-- Rollback : retrait valeur INVOICE_GENERATION_FAILED
--
-- Postgres ne supporte pas DROP VALUE sur ENUM directement. Strategie :
--   1. Sauver les rows OrderHistory referencant la valeur (sinon perte audit)
--   2. Renommer l'enum, recreer sans la valeur, re-typer la colonne, drop ancien
--
-- En pratique, ce rollback ne doit etre execute que si aucun OrderHistory
-- n'a encore utilise INVOICE_GENERATION_FAILED (sinon perte donnees).
-- Verifier avant exec :
--   SELECT COUNT(*) FROM "OrderHistory" WHERE action = 'INVOICE_GENERATION_FAILED';
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
    'REFUND_CREATED',
    'REFUND_COMPLETED',
    'REFUND_FAILED',
    'DISPUTE_OPENED',
    'DISPUTE_RESOLVED',
    'INVOICE_VOIDED',
    'INVOICE_ARCHIVED'
);

ALTER TABLE "OrderHistory"
    ALTER COLUMN "action" TYPE "OrderAction"
    USING ("action"::text::"OrderAction");

DROP TYPE "OrderAction_old";
