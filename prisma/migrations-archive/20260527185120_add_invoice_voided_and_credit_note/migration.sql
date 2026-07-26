-- ============================================================================
-- Cycle VOIDED facture + avoir (credit note) - Art. 272-I CGI / Art. 286 CGI
-- Audit conformite 2026-05-27 -- ORD-COMPLY-003
-- ============================================================================
--
-- Quand une commande deja facturee (invoiceStatus = GENERATED) est annulee
-- ou totalement remboursee, le code doit emettre un avoir (credit note) avec
-- son propre numero sequentiel "A-YYYY-NNNNN" et marquer la facture initiale
-- comme VOIDED (avec timestamp). La facture initiale ne disparait pas (Art.
-- L123-22 - conservation 10 ans), elle est juste "annulee" comptablement.
-- ============================================================================

-- Numero d'avoir + horodatage (format A-YYYY-NNNNN, sequentiel par annee,
-- contrainte UNIQUE comme invoiceNumber).
ALTER TABLE "Order"
    ADD COLUMN "invoiceVoidedAt"       TIMESTAMP(3),
    ADD COLUMN "creditNoteNumber"      VARCHAR(30),
    ADD COLUMN "creditNoteGeneratedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Order_creditNoteNumber_key" ON "Order" ("creditNoteNumber");

-- CHECK constraint : format A-YYYY-NNNNN strict (mirror invoice_number_format_check)
ALTER TABLE "Order"
    ADD CONSTRAINT "Order_creditNoteNumber_format_check"
    CHECK ("creditNoteNumber" IS NULL OR "creditNoteNumber" ~ '^A-[0-9]{4}-[0-9]{5}$');
