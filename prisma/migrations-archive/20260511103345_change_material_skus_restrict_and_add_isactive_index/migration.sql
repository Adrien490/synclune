-- =============================================================================
-- Migration : change_material_skus_restrict_and_add_isactive_index
-- Date      : 2026-05-11
-- Auteur    : audit modules/materials P1.1 + P2.6
-- =============================================================================
--
-- 1. Change la FK ProductSku.materialId de ON DELETE SET NULL vers ON DELETE RESTRICT
--    Ferme la race condition findUnique(_count) ↔ delete dans delete-material.ts
--    (cf. audit 2026-05-11 P1.1). Aligné avec la pré-vérification applicative
--    qui bloque déjà la suppression si des SKUs (y compris soft-deleted) référencent
--    le matériau.
--
-- 2. Ajoute @@index sur Material.isActive pour accélérer les requêtes
--    getMaterialOptions (where isActive: true) et les filtres listing admin.
--
-- Pré-requis production : vérifier qu'aucun SKU n'a actuellement materialId pointant
-- vers un matériau qui n'existe plus (orphelin créé par une précédente SetNull).
-- Si tel est le cas, soit nettoyer manuellement (SET materialId = NULL pour ces SKUs
-- déjà orphelins), soit cette migration échouera silencieusement sur la contrainte.
-- =============================================================================

-- 1. Recréer la FK avec ON DELETE RESTRICT
ALTER TABLE "ProductSku" DROP CONSTRAINT IF EXISTS "ProductSku_materialId_fkey";

ALTER TABLE "ProductSku"
  ADD CONSTRAINT "ProductSku_materialId_fkey"
  FOREIGN KEY ("materialId")
  REFERENCES "Material"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

-- 2. Index sur Material.isActive (filtre fréquent listings + getMaterialOptions)
CREATE INDEX IF NOT EXISTS "Material_isActive_idx" ON "Material"("isActive");
