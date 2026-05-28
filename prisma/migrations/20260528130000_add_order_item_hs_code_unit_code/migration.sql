-- ============================================================================
-- OrderItem : hsCode (nomenclature douaniere SH) + unitCode (UN/ECE Rec 20)
-- Audit conformite 2026-05-28 -- EINV-FORMAT-006 (Phase 3)
-- ============================================================================
--
-- Necessaire pour Factur-X profil BASIC / EN 16931 / EXTENDED (mapping
-- BG-25 Item line items : BT-156 ItemClassificationIdentifier pour HS-code
-- et BT-130 quantite unite via unitCode UN/ECE Rec 20).
--
-- - hsCode  : code nomenclature 6 a 10 chiffres (SH international). Optionnel.
-- - unitCode: code unite (H87 = piece, KGM = kilogramme, MTR = metre, C62 =
--             "one"). Optionnel par ligne, defaut applicatif H87 au checkout
--             pour les bijoux unitaires Synclune. Les commandes anterieures
--             restent NULL (snapshot Art. L102 B - immuabilite historique).
--
-- Pas de backfill : les commandes pre-deploiement n'ont aucun hsCode capture
-- au checkout. La donnee est snapshot uniquement pour les nouvelles ventes.
-- ============================================================================

ALTER TABLE "OrderItem"
    ADD COLUMN "hsCode"   VARCHAR(10),
    ADD COLUMN "unitCode" VARCHAR(3);

-- CHECK : hsCode (si renseigne) compose uniquement de chiffres, 6 a 10 caracteres.
ALTER TABLE "OrderItem"
    ADD CONSTRAINT "OrderItem_hsCode_check"
    CHECK ("hsCode" IS NULL OR "hsCode" ~ '^[0-9]{6,10}$');

-- CHECK : unitCode (si renseigne) doit etre alphanumerique 1-3 caracteres
-- (UN/ECE Rec 20). On valide juste la forme, pas la liste complete (~1000 codes).
ALTER TABLE "OrderItem"
    ADD CONSTRAINT "OrderItem_unitCode_check"
    CHECK ("unitCode" IS NULL OR "unitCode" ~ '^[A-Z0-9]{1,3}$');
