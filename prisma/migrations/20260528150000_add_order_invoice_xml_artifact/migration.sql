-- ============================================================================
-- Order : archivage XML structuré (Factur-X / UBL / CII)
-- Audit conformite 2026-05-28 -- EINV-FORMAT-004 (Phase 3+)
-- ============================================================================
--
-- Persiste l'artifact XML transmis à la PDP / archivé pour audit, en parallèle
-- du PDF (invoicePdfUrl/Hash). Permet :
--  1. Retry idempotent : un même order transmet exactement le même XML, même
--     si le renderer évolue entre deux tentatives.
--  2. Auditabilité : à l'audit fiscal, l'inspecteur compare le XML transmis
--     à la PDP avec ce qui est stocké.
--  3. Cas avoir : `creditNoteXmlUrl`/`Hash` parallèle (post-Phase 2B).
--
-- Le XML reste régénéré à la demande tant que la transmission n'est pas
-- effective (B2C franchise actuel). À l'activation Phase 5 (B2B), l'archivage
-- devient obligatoire (Art. L102 B LPF — restitution sur 10 ans).
-- ============================================================================

ALTER TABLE "Order"
    ADD COLUMN "invoiceXmlUrl"     VARCHAR(2048),
    ADD COLUMN "invoiceXmlHash"    VARCHAR(64),
    ADD COLUMN "invoiceXmlFormat"  VARCHAR(16),
    ADD COLUMN "invoiceXmlArchivedAt" TIMESTAMP(3);

-- CHECK : invoiceXmlFormat doit etre une des valeurs supportees du renderer
-- ("FACTURX_MINIMUM", "FACTURX_BASIC", "UBL_INVOICE", "UBL_CREDITNOTE").
ALTER TABLE "Order"
    ADD CONSTRAINT "Order_invoiceXmlFormat_check"
    CHECK ("invoiceXmlFormat" IS NULL OR "invoiceXmlFormat" IN
        ('FACTURX_MINIMUM', 'FACTURX_BASIC', 'UBL_INVOICE', 'UBL_CREDITNOTE'));

-- CHECK : hash SHA-256 = 64 chars hex (canonical).
ALTER TABLE "Order"
    ADD CONSTRAINT "Order_invoiceXmlHash_format_check"
    CHECK ("invoiceXmlHash" IS NULL OR "invoiceXmlHash" ~ '^[a-f0-9]{64}$');

-- Index partiel : cron archive-invoice-xml cible les Order avec
-- invoiceXmlUrl NULL et facture émise (invoiceStatus = GENERATED).
CREATE INDEX "Order_invoiceXmlArchivedAt_idx" ON "Order" ("invoiceXmlArchivedAt")
    WHERE "invoiceXmlUrl" IS NULL AND "invoiceStatus" = 'GENERATED';
