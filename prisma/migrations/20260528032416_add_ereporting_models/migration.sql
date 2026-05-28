-- ============================================================================
-- E-reporting B2C — facturation electronique 2026-2027 (Phase 3)
-- Audit conformite 2026-05-27 -- EINV-AUDIT-004
-- ============================================================================
--
-- Les ventes B2C ne suivent pas la facturation electronique structurée — elles
-- alimentent l'e-reporting (transmission periodique a la DGFiP). Cette
-- migration ajoute :
--   - EReportingTransaction : 1 ligne par vente PAID ou refund COMPLETED
--   - EReportingBatch        : agregat periodique pour transmission PDP/PA
--
-- Les modeles sont AUTONOMES : aucune mutation des tables existantes (Order,
-- Refund) ne se declenche. C'est le service `buildEReportingTransaction`
-- (J3) qui creera les transactions ; le cron `build-ereporting-batch` (J4)
-- les agregera. La transmission reelle attend le choix d'une PDP/PA.
-- ============================================================================

-- Enums
CREATE TYPE "EReportingTransactionType" AS ENUM ('SALES', 'REFUND', 'PAYMENT');
CREATE TYPE "EReportingStatus" AS ENUM ('PENDING', 'SENT', 'ACCEPTED', 'REJECTED', 'RETRYING', 'ABANDONED');

-- ============================================================================
-- EReportingBatch
-- ============================================================================

CREATE TABLE "EReportingBatch" (
    "id"                  TEXT             NOT NULL,
    "periodFrom"          TIMESTAMP(3)     NOT NULL,
    "periodTo"            TIMESTAMP(3)     NOT NULL,
    "status"              "EReportingStatus" NOT NULL DEFAULT 'PENDING',
    "transactionCount"    INTEGER          NOT NULL DEFAULT 0,
    "totalAmountIncTax"   INTEGER          NOT NULL DEFAULT 0,
    "totalAmountExclTax"  INTEGER          NOT NULL DEFAULT 0,
    "totalTaxAmount"      INTEGER          NOT NULL DEFAULT 0,
    "currency"            VARCHAR(3)       NOT NULL DEFAULT 'EUR',
    "providerBatchId"     VARCHAR(255),
    "providerResponse"    JSONB,
    "sentAt"              TIMESTAMP(3),
    "acceptedAt"          TIMESTAMP(3),
    "rejectedAt"          TIMESTAMP(3),
    "rejectionReason"     TEXT,
    "retryCount"          INTEGER          NOT NULL DEFAULT 0,
    "createdAt"           TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"           TIMESTAMP(3)     NOT NULL,
    CONSTRAINT "EReportingBatch_pkey" PRIMARY KEY ("id")
);

-- Idempotence transmission : un providerBatchId ne peut apparaitre 2 fois.
CREATE UNIQUE INDEX "EReportingBatch_providerBatchId_key" ON "EReportingBatch" ("providerBatchId");

-- Index cron transmit (status=PENDING/RETRYING, oldest first)
CREATE INDEX "EReportingBatch_status_periodFrom_idx" ON "EReportingBatch" ("status", "periodFrom");

-- Index dashboard fiscal (par période)
CREATE INDEX "EReportingBatch_periodFrom_periodTo_idx" ON "EReportingBatch" ("periodFrom", "periodTo");

-- Sanity CHECKs
ALTER TABLE "EReportingBatch" ADD CONSTRAINT "EReportingBatch_transactionCount_non_negative" CHECK ("transactionCount" >= 0);
ALTER TABLE "EReportingBatch" ADD CONSTRAINT "EReportingBatch_currency_eur_check" CHECK ("currency" = 'EUR');
ALTER TABLE "EReportingBatch" ADD CONSTRAINT "EReportingBatch_period_valid" CHECK ("periodFrom" <= "periodTo");

-- ============================================================================
-- EReportingTransaction
-- ============================================================================

CREATE TABLE "EReportingTransaction" (
    "id"              TEXT             NOT NULL,
    "batchId"         TEXT,
    "orderId"         TEXT,
    "refundId"        TEXT,
    "type"            "EReportingTransactionType" NOT NULL,
    "occurredAt"      TIMESTAMP(3)     NOT NULL,
    "countryCode"     VARCHAR(2)       NOT NULL,
    "paymentMethod"   "PaymentMethod"  NOT NULL,
    "amountIncTax"    INTEGER          NOT NULL,
    "amountExclTax"   INTEGER          NOT NULL,
    "taxAmount"       INTEGER          NOT NULL DEFAULT 0,
    "currency"        VARCHAR(3)       NOT NULL DEFAULT 'EUR',
    "payloadSnapshot" JSONB            NOT NULL,
    "status"          "EReportingStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt"       TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EReportingTransaction_pkey" PRIMARY KEY ("id")
);

-- FK : SetNull pour preserver l'historique transaction meme si Order/Refund/
-- Batch est supprime (improbable pour Order/Refund, possible pour Batch purge).
ALTER TABLE "EReportingTransaction" ADD CONSTRAINT "EReportingTransaction_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "EReportingBatch" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EReportingTransaction" ADD CONSTRAINT "EReportingTransaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EReportingTransaction" ADD CONSTRAINT "EReportingTransaction_refundId_fkey" FOREIGN KEY ("refundId") REFERENCES "Refund" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Index cron build-ereporting-batch (PENDING par ancienneté)
CREATE INDEX "EReportingTransaction_status_occurredAt_idx" ON "EReportingTransaction" ("status", "occurredAt");
CREATE INDEX "EReportingTransaction_batchId_idx" ON "EReportingTransaction" ("batchId");
CREATE INDEX "EReportingTransaction_orderId_idx" ON "EReportingTransaction" ("orderId");
CREATE INDEX "EReportingTransaction_refundId_idx" ON "EReportingTransaction" ("refundId");

-- Sanity CHECKs
ALTER TABLE "EReportingTransaction" ADD CONSTRAINT "EReportingTransaction_currency_eur_check" CHECK ("currency" = 'EUR');
ALTER TABLE "EReportingTransaction" ADD CONSTRAINT "EReportingTransaction_countryCode_format" CHECK ("countryCode" ~ '^[A-Z]{2}$');
ALTER TABLE "EReportingTransaction" ADD CONSTRAINT "EReportingTransaction_taxAmount_non_negative" CHECK ("taxAmount" >= 0);
-- Exactement une source de transaction (XOR orderId/refundId — sauf type
-- PAYMENT qui sera relié à un Order plus tard).
ALTER TABLE "EReportingTransaction" ADD CONSTRAINT "EReportingTransaction_source_xor"
    CHECK (
      ("orderId" IS NOT NULL AND "refundId" IS NULL)
      OR ("orderId" IS NULL AND "refundId" IS NOT NULL)
    );
-- amountIncTax cohérent avec le type : SALES/PAYMENT positif, REFUND négatif
ALTER TABLE "EReportingTransaction" ADD CONSTRAINT "EReportingTransaction_amount_sign_matches_type"
    CHECK (
      ("type" = 'REFUND' AND "amountIncTax" < 0)
      OR ("type" IN ('SALES', 'PAYMENT') AND "amountIncTax" > 0)
    );
