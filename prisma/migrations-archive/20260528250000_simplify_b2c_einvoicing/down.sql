-- ============================================================================
-- Rollback : simplification facturation électronique (recentrage B2C)
-- ============================================================================
--
-- Recrée à l'identique l'infrastructure B2B/B2G/XML/transmission PDP supprimée
-- par migration.sql. Reconstitue types, colonnes, CHECK constraints, index et
-- tables tels que définis par les migrations d'origine (20260527212742 →
-- 20260528240000).
--
-- NB : le type CustomerType, Order.customerType et Order_customerType_paidAt_idx
-- n'ont pas été supprimés (conservés pour l'e-reporting) — ils ne sont donc PAS
-- recréés ici. Les valeurs OrderAction PDP_* n'ont jamais été retirées (Postgres
-- ne supporte pas DROP VALUE) — pas de re-ADD nécessaire.
-- ============================================================================

-- 1. Enums transmission ------------------------------------------------------
CREATE TYPE "PdpTransmissionStatus" AS ENUM (
    'PENDING', 'SENT', 'ACCEPTED', 'REJECTED', 'RETRYING', 'CANCELLED', 'ABANDONED'
);
CREATE TYPE "TransmissionDirection" AS ENUM ('OUTBOUND', 'INBOUND');
CREATE TYPE "TransmissionLogStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');
CREATE TYPE "ProviderWebhookEventStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'SKIPPED');

-- 2. User — société + cache annuaire DGFiP + customerType --------------------
ALTER TABLE "User"
    ADD COLUMN "customerType"                      "CustomerType" NOT NULL DEFAULT 'B2C',
    ADD COLUMN "companyName"                        VARCHAR(255),
    ADD COLUMN "companySiren"                        VARCHAR(9),
    ADD COLUMN "companySiret"                        VARCHAR(14),
    ADD COLUMN "companyVatNumber"                    VARCHAR(15),
    ADD COLUMN "customerEInvoicingPlatformId"        VARCHAR(100),
    ADD COLUMN "customerEInvoicingAddress"           VARCHAR(255),
    ADD COLUMN "directoryLastCheckedAt"              TIMESTAMP(3),
    ADD COLUMN "directoryLastCheckedSiretSnapshot"   VARCHAR(14);

ALTER TABLE "User"
    ADD CONSTRAINT "User_companySiren_format_check"
    CHECK ("companySiren" IS NULL OR "companySiren" ~ '^[0-9]{9}$');
ALTER TABLE "User"
    ADD CONSTRAINT "User_companySiret_format_check"
    CHECK ("companySiret" IS NULL OR "companySiret" ~ '^[0-9]{14}$');
ALTER TABLE "User"
    ADD CONSTRAINT "User_companyVatNumber_format_check"
    CHECK ("companyVatNumber" IS NULL OR "companyVatNumber" ~ '^[A-Z]{2}[A-Z0-9]{2,13}$');
ALTER TABLE "User"
    ADD CONSTRAINT "User_directoryLastCheckedSiretSnapshot_format"
    CHECK ("directoryLastCheckedSiretSnapshot" IS NULL OR "directoryLastCheckedSiretSnapshot" ~ '^[0-9]{14}$');

CREATE INDEX "User_customerType_deletedAt_idx" ON "User" ("customerType", "deletedAt");

-- 3. Order — company snapshot ------------------------------------------------
ALTER TABLE "Order"
    ADD COLUMN "customerCompanyName"      VARCHAR(255),
    ADD COLUMN "customerCompanySiren"     VARCHAR(9),
    ADD COLUMN "customerCompanySiret"     VARCHAR(14),
    ADD COLUMN "customerCompanyVatNumber" VARCHAR(15);
ALTER TABLE "Order"
    ADD CONSTRAINT "Order_customerCompanySiren_format_check"
    CHECK ("customerCompanySiren" IS NULL OR "customerCompanySiren" ~ '^[0-9]{9}$');
ALTER TABLE "Order"
    ADD CONSTRAINT "Order_customerCompanySiret_format_check"
    CHECK ("customerCompanySiret" IS NULL OR "customerCompanySiret" ~ '^[0-9]{14}$');
ALTER TABLE "Order"
    ADD CONSTRAINT "Order_customerCompanyVatNumber_format_check"
    CHECK ("customerCompanyVatNumber" IS NULL OR "customerCompanyVatNumber" ~ '^[A-Z]{2}[A-Z0-9]{2,13}$');

-- 4. Order — routing PDP -----------------------------------------------------
ALTER TABLE "Order"
    ADD COLUMN "vendorEInvoicingPlatformId"   VARCHAR(100),
    ADD COLUMN "vendorEInvoicingAddress"      VARCHAR(255),
    ADD COLUMN "customerEInvoicingPlatformId" VARCHAR(100),
    ADD COLUMN "customerEInvoicingAddress"    VARCHAR(255),
    ADD COLUMN "customerPublicEntityCode"     VARCHAR(50),
    ADD COLUMN "customerServiceCode"          VARCHAR(100);

-- 5. Order — statut transmission PDP (batch initial + DLQ) -------------------
ALTER TABLE "Order"
    ADD COLUMN "pdpStatus"          "PdpTransmissionStatus",
    ADD COLUMN "pdpTransmittedAt"   TIMESTAMP(3),
    ADD COLUMN "pdpAcceptedAt"      TIMESTAMP(3),
    ADD COLUMN "pdpRejectedAt"      TIMESTAMP(3),
    ADD COLUMN "pdpRejectionReason" TEXT,
    ADD COLUMN "pdpProviderRef"     VARCHAR(255),
    ADD COLUMN "pdpProviderName"    VARCHAR(100),
    ADD COLUMN "pdpRejectionCode"   VARCHAR(100),
    ADD COLUMN "pdpRetryCount"      INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "pdpLastRetryAt"     TIMESTAMP(3);
ALTER TABLE "Order"
    ADD CONSTRAINT "Order_pdpRetryCount_non_negative" CHECK ("pdpRetryCount" >= 0);
CREATE INDEX "Order_pdpStatus_invoiceGeneratedAt_idx" ON "Order" ("pdpStatus", "invoiceGeneratedAt");
CREATE INDEX "Order_pdpStatus_pdpLastRetryAt_idx" ON "Order" ("pdpStatus", "pdpLastRetryAt");
CREATE INDEX "Order_pdpStatus_pdpTransmittedAt_idx" ON "Order" ("pdpStatus", "pdpTransmittedAt");
CREATE INDEX "Order_transmit_pending_idx" ON "Order" ("paidAt")
    WHERE "pdpStatus" IS NULL AND "invoiceNumber" IS NOT NULL AND "invoicePdfUrl" IS NOT NULL;

-- 6. Order — archivage XML structuré -----------------------------------------
ALTER TABLE "Order"
    ADD COLUMN "invoiceXmlUrl"        VARCHAR(2048),
    ADD COLUMN "invoiceXmlHash"       VARCHAR(64),
    ADD COLUMN "invoiceXmlFormat"     VARCHAR(16),
    ADD COLUMN "invoiceXmlArchivedAt" TIMESTAMP(3);
ALTER TABLE "Order"
    ADD CONSTRAINT "Order_invoiceXmlFormat_check"
    CHECK ("invoiceXmlFormat" IS NULL OR "invoiceXmlFormat" IN
        ('FACTURX_MINIMUM', 'FACTURX_BASIC', 'UBL_INVOICE', 'UBL_CREDITNOTE'));
ALTER TABLE "Order"
    ADD CONSTRAINT "Order_invoiceXmlHash_format_check"
    CHECK ("invoiceXmlHash" IS NULL OR "invoiceXmlHash" ~ '^[a-f0-9]{64}$');
CREATE INDEX "Order_invoiceXmlArchivedAt_idx" ON "Order" ("invoiceXmlArchivedAt")
    WHERE "invoiceXmlUrl" IS NULL AND "invoiceStatus" = 'GENERATED';

-- 7. OrderItem — TVA par ligne + identifiants douaniers ----------------------
ALTER TABLE "OrderItem"
    ADD COLUMN "taxRate"               INTEGER     NOT NULL DEFAULT 0,
    ADD COLUMN "taxAmount"             INTEGER     NOT NULL DEFAULT 0,
    ADD COLUMN "lineTotalExcludingTax" INTEGER     NOT NULL DEFAULT 0,
    ADD COLUMN "lineTotalIncludingTax" INTEGER     NOT NULL DEFAULT 0,
    ADD COLUMN "taxCategoryCode"       VARCHAR(2),
    ADD COLUMN "hsCode"                VARCHAR(10),
    ADD COLUMN "unitCode"              VARCHAR(3);

-- Backfill franchise : exTax == inclTax == price * quantity, catégorie ZB.
UPDATE "OrderItem"
SET "lineTotalExcludingTax" = "price" * "quantity",
    "lineTotalIncludingTax" = "price" * "quantity",
    "taxCategoryCode"       = 'ZB'
WHERE "taxCategoryCode" IS NULL;

ALTER TABLE "OrderItem"
    ADD CONSTRAINT "OrderItem_taxRate_non_negative" CHECK ("taxRate" >= 0);
ALTER TABLE "OrderItem"
    ADD CONSTRAINT "OrderItem_taxAmount_non_negative" CHECK ("taxAmount" >= 0);
ALTER TABLE "OrderItem"
    ADD CONSTRAINT "OrderItem_lineTotalExcludingTax_non_negative" CHECK ("lineTotalExcludingTax" >= 0);
ALTER TABLE "OrderItem"
    ADD CONSTRAINT "OrderItem_lineTotalIncludingTax_non_negative" CHECK ("lineTotalIncludingTax" >= 0);
ALTER TABLE "OrderItem"
    ADD CONSTRAINT "OrderItem_taxCategoryCode_check"
    CHECK ("taxCategoryCode" IS NULL OR "taxCategoryCode" IN ('S', 'Z', 'ZB', 'AE', 'E', 'G', 'K'));
ALTER TABLE "OrderItem"
    ADD CONSTRAINT "OrderItem_hsCode_check"
    CHECK ("hsCode" IS NULL OR "hsCode" ~ '^[0-9]{6,10}$');
ALTER TABLE "OrderItem"
    ADD CONSTRAINT "OrderItem_unitCode_check"
    CHECK ("unitCode" IS NULL OR "unitCode" ~ '^[A-Z0-9]{1,3}$');

-- 8. InvoiceTransmissionLog (audit immuable) ---------------------------------
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

-- 9. ProviderWebhookEvent (idempotence webhook PDP) --------------------------
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
CREATE INDEX "ProviderWebhookEvent_status_processedAt_idx" ON "ProviderWebhookEvent" ("status", "processedAt");
CREATE INDEX "ProviderWebhookEvent_status_receivedAt_idx" ON "ProviderWebhookEvent" ("status", "receivedAt");
CREATE INDEX "ProviderWebhookEvent_status_attempts_processedAt_idx"
    ON "ProviderWebhookEvent" ("status", "attempts", "processedAt");
ALTER TABLE "ProviderWebhookEvent"
    ADD CONSTRAINT "ProviderWebhookEvent_attempts_non_negative" CHECK ("attempts" >= 0);
