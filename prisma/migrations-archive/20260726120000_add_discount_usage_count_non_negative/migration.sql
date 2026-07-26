-- Audit « Codes promo / discounts » — P1-3 [[DISC-USAGE-002]]
--
-- `Discount.usageCount` n'avait qu'une borne HAUTE
-- (`Discount_usageCount_within_limit`, migration 20260212_schema_audit_v2).
-- Quatre chemins de libération décrémentaient sans garde `usageCount > 0`
-- (annulation admin / client / en lot, cron cleanup-pending-orders). Combinés à
-- l'action admin `resetDiscountCounter` — qui remet le compteur à 0 en
-- CONSERVANT l'historique `DiscountUsage` —, l'annulation d'une commande
-- antérieure faisait passer `usageCount` en négatif, rendant le code promo
-- redeemable AU-DELÀ de `maxUsageCount` (chaque annulation creusant l'écart).
--
-- Le code est corrigé (tous les chemins passent désormais par
-- `releaseOrderDiscountUsageTx`, dont le décrément est gardé). Cette contrainte
-- est le filet en profondeur, symétrique de la borne haute existante.

-- ============================================================================
-- 1. Normaliser les compteurs déjà négatifs (sinon l'ADD CONSTRAINT échoue)
-- ============================================================================

UPDATE "Discount"
SET "usageCount" = 0
WHERE "usageCount" < 0;

-- ============================================================================
-- 2. Borne basse
-- ============================================================================

ALTER TABLE "Discount"
  ADD CONSTRAINT "Discount_usageCount_non_negative"
  CHECK ("usageCount" >= 0);
