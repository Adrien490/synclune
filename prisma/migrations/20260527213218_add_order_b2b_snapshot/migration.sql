-- ============================================================================
-- Order : snapshot B2B/B2G client - facturation electronique 2026-2027
-- Audit conformite 2026-05-27 -- EINV-AUDIT-001 (Phase 2A)
-- ============================================================================
--
-- Snapshot du type de client + identifiants entreprise au moment du checkout.
-- Une commande emise en B2B garde ses donnees figees meme si le User bascule
-- B2B->B2C plus tard (ou est anonymise RGPD). Art. 289 CGI : la facture doit
-- rester reconstituable a l'identique 10 ans.
-- ============================================================================

ALTER TABLE "Order"
    ADD COLUMN "customerType"             "CustomerType" NOT NULL DEFAULT 'B2C',
    ADD COLUMN "customerCompanyName"      VARCHAR(255),
    ADD COLUMN "customerCompanySiren"     VARCHAR(9),
    ADD COLUMN "customerCompanySiret"     VARCHAR(14),
    ADD COLUMN "customerCompanyVatNumber" VARCHAR(15);

-- CHECK constraints : meme regle de canonicalisation que User
ALTER TABLE "Order"
    ADD CONSTRAINT "Order_customerCompanySiren_format_check"
    CHECK ("customerCompanySiren" IS NULL OR "customerCompanySiren" ~ '^[0-9]{9}$');

ALTER TABLE "Order"
    ADD CONSTRAINT "Order_customerCompanySiret_format_check"
    CHECK ("customerCompanySiret" IS NULL OR "customerCompanySiret" ~ '^[0-9]{14}$');

ALTER TABLE "Order"
    ADD CONSTRAINT "Order_customerCompanyVatNumber_format_check"
    CHECK ("customerCompanyVatNumber" IS NULL OR "customerCompanyVatNumber" ~ '^[A-Z]{2}[A-Z0-9]{2,13}$');

-- Index : dashboard admin (B2B vs B2C), futur agregat e-reporting B2C par
-- periode (Phase 3).
CREATE INDEX "Order_customerType_paidAt_idx" ON "Order" ("customerType", "paidAt" DESC);
