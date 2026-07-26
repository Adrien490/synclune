-- ============================================================================
-- Archivage immuable PDF facture (UploadThing) - best practice Art. L102 B LPF
-- Audit conformité 2026-05-27 -- ORD-COMPLY-005
-- ============================================================================
--
-- Stocke l'URL UploadThing + le hash SHA-256 du PDF facture après sa première
-- génération. Le PDF est ensuite servi depuis UploadThing (immuable bit-à-bit)
-- au lieu d'être régénéré dynamiquement, garantissant que la facture restituée
-- à 10 ans est identique à celle émise le jour de l'encaissement (même si le
-- template évolue).
--
-- invoicePdfHash sert d'empreinte vérifiable côté contrôle fiscal.
-- ============================================================================

ALTER TABLE "Order"
    ADD COLUMN "invoicePdfUrl"  VARCHAR(2048),
    ADD COLUMN "invoicePdfHash" VARCHAR(64);
