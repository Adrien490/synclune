-- ============================================================================
-- Order : extension snapshot vendeur (email, APE, IBAN, BIC)
-- Audit conformite 2026-05-28 -- EINV-FORMAT-007 / EINV-FORMAT-008 (Phase 3)
-- ============================================================================
--
-- Complete le snapshot vendeur introduit dans 20260528040000 :
--  - vendorEmail   : email vendeur figé (les factures historiques restent
--                    valides même si l'email contact change).
--  - vendorApeCode : code APE figé (extension auditabilité INSEE).
--  - vendorBankIban: IBAN encaissement vendeur (BT-84 EN16931). Critique B2B
--                    sur virement — un changement d'IBAN ne doit pas réécrire
--                    les factures historiques.
--  - vendorBankBic : BIC/SWIFT (BT-86 EN16931).
--
-- Tous NULLABLE (rétrocompat). Les Order anterieurs gardent NULL → fallback
-- getVendorLegalInfo() (env actuel) côté buildSellerInfo.
-- ============================================================================

ALTER TABLE "Order"
    ADD COLUMN "vendorEmail"    VARCHAR(255),
    ADD COLUMN "vendorApeCode"  VARCHAR(10),
    ADD COLUMN "vendorBankIban" VARCHAR(34),
    ADD COLUMN "vendorBankBic"  VARCHAR(11);

-- CHECK : APE code FR format `NN.NNL` (ex 47.91B). Optionnel.
ALTER TABLE "Order"
    ADD CONSTRAINT "Order_vendorApeCode_format_check"
    CHECK ("vendorApeCode" IS NULL OR "vendorApeCode" ~ '^[0-9]{2}\.[0-9]{2}[A-Z]$');

-- CHECK : IBAN ISO 13616 (2 lettres pays + 2 chiffres clé + jusqu'a 30 BBAN).
ALTER TABLE "Order"
    ADD CONSTRAINT "Order_vendorBankIban_format_check"
    CHECK ("vendorBankIban" IS NULL OR "vendorBankIban" ~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{4,30}$');

-- CHECK : BIC ISO 9362 (6 lettres + 2 alphanum + optionnel 3 alphanum).
ALTER TABLE "Order"
    ADD CONSTRAINT "Order_vendorBankBic_format_check"
    CHECK ("vendorBankBic" IS NULL OR "vendorBankBic" ~ '^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$');
