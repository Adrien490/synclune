-- ============================================================================
-- CHECK SHA-256 sur les hashes PDF (facture + avoir)
-- Audit Prisma facturation électronique 2026-05-28 -- EINV-PRISMA-002
-- ============================================================================
--
-- Les hashes JSON (`invoiceDataHash`) et XML (`invoiceXmlHash`) avaient déjà un
-- CHECK `^[a-f0-9]{64}$` ; les hashes PDF (empreinte du document archivé
-- immuable, Art. L102 B LPF) n'en avaient aucun. On aligne l'intégrité des 3
-- colonnes : une empreinte non-hex / tronquée / majuscule ne doit jamais être
-- persistée silencieusement (vérifiabilité à l'audit fiscal sur 10 ans).
-- NULL reste autorisé (commande non encore archivée).
-- ============================================================================

ALTER TABLE "Order"
    ADD CONSTRAINT "Order_invoicePdfHash_format_check"
    CHECK ("invoicePdfHash" IS NULL OR "invoicePdfHash" ~ '^[a-f0-9]{64}$');

ALTER TABLE "Order"
    ADD CONSTRAINT "Order_creditNotePdfHash_format_check"
    CHECK ("creditNotePdfHash" IS NULL OR "creditNotePdfHash" ~ '^[a-f0-9]{64}$');

ALTER TABLE "Refund"
    ADD CONSTRAINT "Refund_creditNotePdfHash_format_check"
    CHECK ("creditNotePdfHash" IS NULL OR "creditNotePdfHash" ~ '^[a-f0-9]{64}$');
