-- ============================================================================
-- User B2B fields - facturation electronique 2026-2027
-- Audit conformite 2026-05-27 -- EINV-AUDIT-001 (Phase 2A)
-- ============================================================================
--
-- Distingue B2C (defaut, comportement actuel), B2B (entreprise client) et
-- B2G (entite publique, Chorus Pro). Tous les champs entreprise sont
-- nullable et valides applicativement quand customerType != B2C.
--
-- Le stockage est strictement normalise : pas d'espaces dans SIREN/SIRET
-- (la normalisation est faite cote application au write).
-- ============================================================================

-- Enum
CREATE TYPE "CustomerType" AS ENUM ('B2C', 'B2B', 'B2G');

-- Colonnes
ALTER TABLE "User"
    ADD COLUMN "customerType"     "CustomerType" NOT NULL DEFAULT 'B2C',
    ADD COLUMN "companyName"      VARCHAR(255),
    ADD COLUMN "companySiren"     VARCHAR(9),
    ADD COLUMN "companySiret"     VARCHAR(14),
    ADD COLUMN "companyVatNumber" VARCHAR(15);

-- CHECK constraints : format strict au niveau DB (defense en profondeur).
-- L'application normalise les espaces avant write, donc seule la version
-- canonique (chiffres uniquement) est acceptee ici.
ALTER TABLE "User"
    ADD CONSTRAINT "User_companySiren_format_check"
    CHECK ("companySiren" IS NULL OR "companySiren" ~ '^[0-9]{9}$');

ALTER TABLE "User"
    ADD CONSTRAINT "User_companySiret_format_check"
    CHECK ("companySiret" IS NULL OR "companySiret" ~ '^[0-9]{14}$');

-- VAT intra-UE : ISO 3166-1 alpha-2 (2 lettres) + identifiant national.
-- Format FR specifique : FR + 2 chiffres-cle + 9 chiffres SIREN.
-- La regex generique accepte les autres pays UE (DE, IT, etc.) pour
-- future extension export intra-communautaire.
ALTER TABLE "User"
    ADD CONSTRAINT "User_companyVatNumber_format_check"
    CHECK ("companyVatNumber" IS NULL OR "companyVatNumber" ~ '^[A-Z]{2}[A-Z0-9]{2,13}$');

-- Index admin listing B2B/B2G (filtre futur)
CREATE INDEX "User_customerType_deletedAt_idx" ON "User" ("customerType", "deletedAt");
