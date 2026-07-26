-- ============================================================================
-- Order : statut transmission PDP par facture + enum PdpTransmissionStatus
-- Facturation electronique B2B/B2G — emission obligatoire 2027-09-01
-- ============================================================================
--
-- Granularite par facture (vs EReportingBatch qui est un agregat journalier
-- B2C). A partir de 2027-09-01 chaque facture B2B/B2G est transmise
-- individuellement a la PDP du client avec ACK explicite — d'ou la necessite
-- d'un statut local + horodatages + reference provider pour le cron de retry.
-- ============================================================================

-- Enum
CREATE TYPE "PdpTransmissionStatus" AS ENUM (
    'PENDING',
    'SENT',
    'ACCEPTED',
    'REJECTED',
    'RETRYING',
    'ABANDONED'
);

-- Colonnes
ALTER TABLE "Order"
    ADD COLUMN "pdpStatus"          "PdpTransmissionStatus",
    ADD COLUMN "pdpTransmittedAt"   TIMESTAMP(3),
    ADD COLUMN "pdpAcceptedAt"      TIMESTAMP(3),
    ADD COLUMN "pdpRejectedAt"      TIMESTAMP(3),
    ADD COLUMN "pdpRejectionReason" TEXT,
    ADD COLUMN "pdpProviderRef"     VARCHAR(255);

-- Index : cron retry transmission PDP (lookups par status puis tri chronologique
-- par invoiceGeneratedAt pour replayer les plus anciennes en priorite).
CREATE INDEX "Order_pdpStatus_invoiceGeneratedAt_idx"
    ON "Order" ("pdpStatus", "invoiceGeneratedAt");
