-- ============================================================================
-- Order : snapshot vendeur + enum VatRegime
-- Facturation electronique 2026-2027 — invariant Art. L102 B LPF
-- ============================================================================
--
-- Fige l'identite du vendeur (raison sociale, SIRET, regime TVA, etc.) au
-- moment de l'emission de la facture. Si Synclune change de SIRET, demenage,
-- sort de la franchise art. 293 B CGI ou bascule en EURL/SAS, les factures
-- historiques restent reconstituables a l'identique meme apres modification
-- des variables d'environnement VENDOR_*.
--
-- Toutes les colonnes sont NULLABLE : les Order anterieurs a cette migration
-- restent sans snapshot et la regeneration PDF retombe sur getVendorLegalInfo()
-- (env actuel) en fallback best-effort. Le PDF archive UploadThing reste
-- l'autorite immuable via invoicePdfHash SHA-256.
-- ============================================================================

-- Enum
CREATE TYPE "VatRegime" AS ENUM ('FRANCHISE_BASE', 'NORMAL', 'SIMPLIFIE');

-- Colonnes
ALTER TABLE "Order"
    ADD COLUMN "vendorLegalName" VARCHAR(255),
    ADD COLUMN "vendorTradeName" VARCHAR(255),
    ADD COLUMN "vendorAddress"   VARCHAR(500),
    ADD COLUMN "vendorSiren"     VARCHAR(9),
    ADD COLUMN "vendorSiret"     VARCHAR(14),
    ADD COLUMN "vendorVatNumber" VARCHAR(15),
    ADD COLUMN "vendorVatRegime" "VatRegime",
    ADD COLUMN "vendorLegalForm" VARCHAR(100);

-- CHECK constraints : meme regle canonique que customerCompany*
ALTER TABLE "Order"
    ADD CONSTRAINT "Order_vendorSiren_format_check"
    CHECK ("vendorSiren" IS NULL OR "vendorSiren" ~ '^[0-9]{9}$');

ALTER TABLE "Order"
    ADD CONSTRAINT "Order_vendorSiret_format_check"
    CHECK ("vendorSiret" IS NULL OR "vendorSiret" ~ '^[0-9]{14}$');

ALTER TABLE "Order"
    ADD CONSTRAINT "Order_vendorVatNumber_format_check"
    CHECK ("vendorVatNumber" IS NULL OR "vendorVatNumber" ~ '^[A-Z]{2}[A-Z0-9]{2,13}$');
