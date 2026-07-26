-- Rollback de 20260726190000_drop_ereporting.
--
-- Restaure la structure e-reporting (tables vides + colonnes DLQ). Les données
-- ne sont PAS restaurables par ce script : si des lignes avaient existé, passer
-- par un PITR Neon. À la date du drop les tables étaient vides (flag jamais
-- activé, boutique jamais ouverte).

CREATE TYPE "EReportingTransactionType" AS ENUM ('SALES', 'REFUND', 'PAYMENT');
CREATE TYPE "EReportingStatus" AS ENUM ('PENDING', 'SENT', 'ACCEPTED', 'REJECTED', 'RETRYING', 'ABANDONED');

CREATE TABLE "EReportingPeriod" (
    "id" TEXT NOT NULL,
    "periodFrom" TIMESTAMP(3) NOT NULL,
    "periodTo" TIMESTAMP(3) NOT NULL,
    "periodKey" VARCHAR(30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EReportingPeriod_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EReportingPeriod_periodKey_key" ON "EReportingPeriod"("periodKey");
CREATE INDEX "EReportingPeriod_periodFrom_periodTo_idx" ON "EReportingPeriod"("periodFrom", "periodTo");

-- Non-recouvrement des périodes (EINV-EREPORT-006).
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE "EReportingPeriod"
    ADD CONSTRAINT "EReportingPeriod_no_overlap"
    EXCLUDE USING gist (tstzrange("periodFrom"::timestamptz, "periodTo"::timestamptz, '[)') WITH &&);

CREATE TABLE "EReportingBatch" (
    "id" TEXT NOT NULL,
    "periodId" TEXT,
    "periodFrom" TIMESTAMP(3) NOT NULL,
    "periodTo" TIMESTAMP(3) NOT NULL,
    "status" "EReportingStatus" NOT NULL DEFAULT 'PENDING',
    "transactionCount" INTEGER NOT NULL DEFAULT 0,
    "totalAmountIncTax" INTEGER NOT NULL DEFAULT 0,
    "totalAmountExclTax" INTEGER NOT NULL DEFAULT 0,
    "totalTaxAmount" INTEGER NOT NULL DEFAULT 0,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'EUR',
    "providerBatchId" VARCHAR(255),
    "rejectionReason" VARCHAR(1000),
    "requeueCount" INTEGER NOT NULL DEFAULT 0,
    "submittedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EReportingBatch_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "EReportingBatch_periodId_fkey" FOREIGN KEY ("periodId")
        REFERENCES "EReportingPeriod"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "EReportingBatch_periodId_idx" ON "EReportingBatch"("periodId");
CREATE INDEX "EReportingBatch_periodFrom_periodTo_idx" ON "EReportingBatch"("periodFrom", "periodTo");
CREATE INDEX "EReportingBatch_status_periodFrom_idx" ON "EReportingBatch"("status", "periodFrom");

CREATE TABLE "EReportingTransaction" (
    "id" TEXT NOT NULL,
    "batchId" TEXT,
    "orderId" TEXT,
    "refundId" TEXT,
    "type" "EReportingTransactionType" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "countryCode" VARCHAR(2) NOT NULL DEFAULT 'FR',
    "amountIncTax" INTEGER NOT NULL,
    "amountExclTax" INTEGER NOT NULL,
    "taxAmount" INTEGER NOT NULL DEFAULT 0,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'EUR',
    "paymentMethod" "PaymentMethod",
    "operationCategory" "EReportingOperationCategory" NOT NULL DEFAULT 'GOODS',
    "payloadHash" VARCHAR(64),
    "status" "EReportingStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EReportingTransaction_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "EReportingTransaction_batchId_fkey" FOREIGN KEY ("batchId")
        REFERENCES "EReportingBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "EReportingTransaction_orderId_fkey" FOREIGN KEY ("orderId")
        REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "EReportingTransaction_refundId_fkey" FOREIGN KEY ("refundId")
        REFERENCES "Refund"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "EReportingTransaction_batchId_idx" ON "EReportingTransaction"("batchId");
CREATE INDEX "EReportingTransaction_orderId_idx" ON "EReportingTransaction"("orderId");
CREATE INDEX "EReportingTransaction_refundId_idx" ON "EReportingTransaction"("refundId");
CREATE INDEX "EReportingTransaction_status_occurredAt_idx" ON "EReportingTransaction"("status", "occurredAt");
CREATE UNIQUE INDEX "EReportingTransaction_orderId_type_key" ON "EReportingTransaction"("orderId", "type");
CREATE UNIQUE INDEX "EReportingTransaction_refundId_type_key" ON "EReportingTransaction"("refundId", "type");

-- Couplage source ↔ type (SALES ⇒ orderId seul, REFUND ⇒ refundId seul).
ALTER TABLE "EReportingTransaction"
    ADD CONSTRAINT "EReportingTransaction_source_xor" CHECK (
        ("type" = 'SALES'  AND "orderId" IS NOT NULL AND "refundId" IS NULL)
     OR ("type" = 'REFUND' AND "refundId" IS NOT NULL AND "orderId" IS NULL)
     OR ("type" = 'PAYMENT')
    );

-- Colonnes DLQ + index partiels.
ALTER TABLE "Order"  ADD COLUMN "ereportingRetryDeferred" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Refund" ADD COLUMN "ereportingRetryDeferred" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "Order_ereportingRetryDeferred_idx"  ON "Order"("ereportingRetryDeferred", "paidAt");
CREATE INDEX "Refund_ereportingRetryDeferred_idx" ON "Refund"("ereportingRetryDeferred", "processedAt");
