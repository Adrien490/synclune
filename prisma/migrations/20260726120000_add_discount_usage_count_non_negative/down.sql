-- Rollback : retire la borne basse sur Discount.usageCount.
-- Note : le UPDATE de normalisation (usageCount < 0 → 0) n'est pas réversible
-- (l'ancienne valeur négative était de toute façon un état corrompu).

ALTER TABLE "Discount" DROP CONSTRAINT IF EXISTS "Discount_usageCount_non_negative";
