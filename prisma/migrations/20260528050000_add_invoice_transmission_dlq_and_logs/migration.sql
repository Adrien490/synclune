-- ============================================================================
-- Phase 5 — DLQ retry + audit transmission PDP/PA
-- ============================================================================
--
-- Cette migration prepare l'integration future d'une plateforme agreee (PDP)
-- sans choix de fournisseur. Aucun fournisseur n'est encore branche : tout
-- reste fonctionnel avec LocalPdfProvider (no-op).
--
-- Ajouts :
--   1. PdpTransmissionStatus +CANCELLED (parite avec ProviderInvoiceStatus TS)
--   2. Order.pdpProviderName / pdpRejectionCode / pdpRetryCount / pdpLastRetryAt
--   3. Order indexes pour cron retry + reconcile
--   4. User : 4 champs routage annuaire DGFiP
--   5. InvoiceTransmissionLog (audit immuable Art. 286 CGI)
--   6. ProviderWebhookEvent (idempotence webhook PDP, table dediee)
-- ============================================================================

-- 1. Enum extensions ---------------------------------------------------------

ALTER TYPE "PdpTransmissionStatus" ADD VALUE 'CANCELLED' BEFORE 'ABANDONED';

-- OrderAction : 6 nouvelles actions PDP_* pour audit trail
ALTER TYPE "OrderAction" ADD VALUE 'PDP_SUBMITTED';
ALTER TYPE "OrderAction" ADD VALUE 'PDP_ACCEPTED';
ALTER TYPE "OrderAction" ADD VALUE 'PDP_REJECTED';
ALTER TYPE "OrderAction" ADD VALUE 'PDP_RETRY';
ALTER TYPE "OrderAction" ADD VALUE 'PDP_ABANDONED';
ALTER TYPE "OrderAction" ADD VALUE 'PDP_CANCELLED';

CREATE TYPE "TransmissionDirection" AS ENUM ('OUTBOUND', 'INBOUND');
CREATE TYPE "TransmissionLogStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');
CREATE TYPE "ProviderWebhookEventStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'SKIPPED');

-- 2. Order — DLQ retry + provider snapshot -----------------------------------

ALTER TABLE "Order"
    ADD COLUMN "pdpProviderName"  VARCHAR(100),
    ADD COLUMN "pdpRejectionCode" VARCHAR(100),
    ADD COLUMN "pdpRetryCount"    INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "pdpLastRetryAt"   TIMESTAMP(3);

ALTER TABLE "Order"
    ADD CONSTRAINT "Order_pdpRetryCount_non_negative" CHECK ("pdpRetryCount" >= 0);

-- 3. Order indexes -----------------------------------------------------------

CREATE INDEX "Order_pdpStatus_pdpLastRetryAt_idx"
    ON "Order" ("pdpStatus", "pdpLastRetryAt");

CREATE INDEX "Order_pdpStatus_pdpTransmittedAt_idx"
    ON "Order" ("pdpStatus", "pdpTransmittedAt");

-- 4. User — Cache annuaire DGFiP --------------------------------------------

ALTER TABLE "User"
    ADD COLUMN "customerEInvoicingPlatformId"      VARCHAR(100),
    ADD COLUMN "customerEInvoicingAddress"         VARCHAR(255),
    ADD COLUMN "directoryLastCheckedAt"            TIMESTAMP(3),
    ADD COLUMN "directoryLastCheckedSiretSnapshot" VARCHAR(14);

-- 5. InvoiceTransmissionLog (audit immuable) ---------------------------------

CREATE TABLE "InvoiceTransmissionLog" (
    "id"                TEXT                    NOT NULL,
    "orderId"           TEXT,
    "provider"          VARCHAR(100)            NOT NULL,
    "direction"         "TransmissionDirection" NOT NULL,
    "status"            "TransmissionLogStatus" NOT NULL,
    "attempt"           INTEGER                 NOT NULL DEFAULT 1,
    "invoiceNumber"     VARCHAR(30),
    "providerInvoiceId" VARCHAR(255),
    "errorCode"         VARCHAR(100),
    "errorMessage"      TEXT,
    "payloadSnapshot"   JSONB,
    "occurredAt"        TIMESTAMP(3)            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InvoiceTransmissionLog_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "InvoiceTransmissionLog"
    ADD CONSTRAINT "InvoiceTransmissionLog_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InvoiceTransmissionLog"
    ADD CONSTRAINT "InvoiceTransmissionLog_attempt_positive" CHECK ("attempt" >= 1);

CREATE INDEX "InvoiceTransmissionLog_orderId_occurredAt_idx"
    ON "InvoiceTransmissionLog" ("orderId", "occurredAt" DESC);

CREATE INDEX "InvoiceTransmissionLog_status_occurredAt_idx"
    ON "InvoiceTransmissionLog" ("status", "occurredAt" DESC);

CREATE INDEX "InvoiceTransmissionLog_provider_status_occurredAt_idx"
    ON "InvoiceTransmissionLog" ("provider", "status", "occurredAt" DESC);

-- 6. ProviderWebhookEvent (idempotence webhook PDP) --------------------------

CREATE TABLE "ProviderWebhookEvent" (
    "id"              TEXT                         NOT NULL,
    "provider"        VARCHAR(100)                 NOT NULL,
    "externalEventId" VARCHAR(255)                 NOT NULL,
    "eventType"       VARCHAR(100)                 NOT NULL,
    "status"          "ProviderWebhookEventStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage"    TEXT,
    "attempts"        INTEGER                      NOT NULL DEFAULT 0,
    "receivedAt"      TIMESTAMP(3)                 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt"     TIMESTAMP(3),
    "payloadSnapshot" JSONB,
    CONSTRAINT "ProviderWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProviderWebhookEvent_provider_externalEventId_key"
    ON "ProviderWebhookEvent" ("provider", "externalEventId");

CREATE INDEX "ProviderWebhookEvent_status_processedAt_idx"
    ON "ProviderWebhookEvent" ("status", "processedAt");

CREATE INDEX "ProviderWebhookEvent_status_receivedAt_idx"
    ON "ProviderWebhookEvent" ("status", "receivedAt");

CREATE INDEX "ProviderWebhookEvent_status_attempts_processedAt_idx"
    ON "ProviderWebhookEvent" ("status", "attempts", "processedAt");

ALTER TABLE "ProviderWebhookEvent"
    ADD CONSTRAINT "ProviderWebhookEvent_attempts_non_negative" CHECK ("attempts" >= 0);

-- 7. CHECK constraint format SIRET cache annuaire User -----------------------

ALTER TABLE "User"
    ADD CONSTRAINT "User_directoryLastCheckedSiretSnapshot_format"
    CHECK (
      "directoryLastCheckedSiretSnapshot" IS NULL
      OR "directoryLastCheckedSiretSnapshot" ~ '^[0-9]{14}$'
    );
