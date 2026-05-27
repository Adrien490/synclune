-- ============================================================================
-- OrderItem : TVA par ligne - facturation electronique 2026-2027
-- Audit conformite 2026-05-27 -- EINV-AUDIT-002 (Phase 2A)
-- ============================================================================
--
-- Necessaire pour generer du Factur-X / UBL / CII (mapping CEFACT UNTDID
-- BT-151 Item VAT category, BT-152 Item VAT rate, BT-117 Net amount).
--
-- Synclune est aujourd'hui en franchise (Art. 293 B CGI) : tous les
-- nouveaux champs valent 0 / "ZB" / price*quantity pour les commandes
-- existantes. Le code applicatif populera ces valeurs au checkout (sans
-- derivation au read pour preserver le snapshot Art. L102 B).
-- ============================================================================

ALTER TABLE "OrderItem"
    ADD COLUMN "taxRate"               INTEGER     NOT NULL DEFAULT 0, -- basis points (2000 = 20%)
    ADD COLUMN "taxAmount"             INTEGER     NOT NULL DEFAULT 0, -- centimes
    ADD COLUMN "lineTotalExcludingTax" INTEGER     NOT NULL DEFAULT 0,
    ADD COLUMN "lineTotalIncludingTax" INTEGER     NOT NULL DEFAULT 0,
    ADD COLUMN "taxCategoryCode"       VARCHAR(2); -- UNTDID 5305 : ZB / Z / S / AE / E / G / K

-- Backfill : pour la franchise actuelle, exTax == inclTax == price * quantity,
-- taxRate=0, taxAmount=0, taxCategoryCode='ZB' (zero rate, franchise art. 293 B).
-- N'ecrase pas les lignes qui auraient deja un taxCategoryCode (idempotent).
UPDATE "OrderItem"
SET "lineTotalExcludingTax" = "price" * "quantity",
    "lineTotalIncludingTax" = "price" * "quantity",
    "taxCategoryCode"       = 'ZB'
WHERE "taxCategoryCode" IS NULL;

-- CHECK constraints : negative tax/total = bug applicatif
ALTER TABLE "OrderItem"
    ADD CONSTRAINT "OrderItem_taxRate_non_negative" CHECK ("taxRate" >= 0);

ALTER TABLE "OrderItem"
    ADD CONSTRAINT "OrderItem_taxAmount_non_negative" CHECK ("taxAmount" >= 0);

ALTER TABLE "OrderItem"
    ADD CONSTRAINT "OrderItem_lineTotalExcludingTax_non_negative" CHECK ("lineTotalExcludingTax" >= 0);

ALTER TABLE "OrderItem"
    ADD CONSTRAINT "OrderItem_lineTotalIncludingTax_non_negative" CHECK ("lineTotalIncludingTax" >= 0);

-- CHECK : taxCategoryCode doit etre une valeur UNTDID 5305 connue
ALTER TABLE "OrderItem"
    ADD CONSTRAINT "OrderItem_taxCategoryCode_check"
    CHECK ("taxCategoryCode" IS NULL OR "taxCategoryCode" IN ('S', 'Z', 'ZB', 'AE', 'E', 'G', 'K'));
