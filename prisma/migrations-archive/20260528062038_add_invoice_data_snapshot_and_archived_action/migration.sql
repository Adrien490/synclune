-- ============================================================================
-- Snapshot InvoiceData figé + archivage tracé + OrderAction.INVOICE_ARCHIVED
-- Audit comptable-tech 2026-05-28 — EINV-PDF-001..006
-- ============================================================================
--
-- 1. `invoiceDataSnapshot` (JSONB) — payload `InvoiceData` complet figé au
--    moment de l'attribution du numéro de facture. C'est LA facture au sens
--    comptable (Art. L102 B LPF : restitution à l'identique). Le PDF n'est
--    qu'un rendu dérivé. Une régénération future à partir du snapshot doit
--    produire un PDF identique au PDF archivé (déterminisme jsPDF garanti).
--
-- 2. `invoiceDataHash` (VARCHAR 64) — SHA-256 du snapshot canonical-JSON
--    (clés triées). Empreinte vérifiable pour audit fiscal. CHECK regex
--    `^[a-f0-9]{64}$`. NULL autorisé pour rétro-compat (factures pré-2026-05-28).
--
-- 3. `invoiceArchivedAt` (TIMESTAMP) — horodatage d'archivage UploadThing.
--    Permet au cron `archive-unarchived-invoices` de cibler les retards.
--
-- 4. `OrderAction.INVOICE_ARCHIVED` — nouvelle valeur d'enum pour tracer le
--    moment où le PDF est uploadé sur UploadThing (audit trail Art. L123-22).
-- ============================================================================

-- 1. Colonnes Order
ALTER TABLE "Order"
    ADD COLUMN "invoiceDataSnapshot" JSONB,
    ADD COLUMN "invoiceDataHash"     VARCHAR(64),
    ADD COLUMN "invoiceArchivedAt"   TIMESTAMP(3);

-- 2. CHECK constraint regex SHA-256 hex64 lowercase
ALTER TABLE "Order"
    ADD CONSTRAINT "Order_invoiceDataHash_format_check"
    CHECK ("invoiceDataHash" IS NULL OR "invoiceDataHash" ~ '^[a-f0-9]{64}$');

-- 3. CHECK : si snapshot présent, hash obligatoire et inversement (cohérence)
ALTER TABLE "Order"
    ADD CONSTRAINT "Order_invoiceDataSnapshot_hash_coherence_check"
    CHECK (
        ("invoiceDataSnapshot" IS NULL AND "invoiceDataHash" IS NULL)
        OR
        ("invoiceDataSnapshot" IS NOT NULL AND "invoiceDataHash" IS NOT NULL)
    );

-- 4. Index pour le cron archive-unarchived-invoices : couvre les factures
--    générées (invoiceStatus = GENERATED) mais pas encore archivées (URL null).
--    Index full (sans WHERE partial) pour rester compatible Prisma schema sync.
CREATE INDEX "Order_invoiceStatus_invoicePdfUrl_idx"
    ON "Order" ("invoiceStatus", "invoiceArchivedAt");

-- 5. Enum OrderAction : ajout INVOICE_ARCHIVED
ALTER TYPE "OrderAction" ADD VALUE 'INVOICE_ARCHIVED';
