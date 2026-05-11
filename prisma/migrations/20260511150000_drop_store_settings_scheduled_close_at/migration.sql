-- =====================================================================
-- Drop dead column StoreSettings.scheduledCloseAt
-- =====================================================================
-- Audit store-settings 2026-05-11 P1.4 :
--   - Le champ StoreSettings.scheduledCloseAt n'est référencé par aucun code
--     applicatif (vérifié : grep dans modules/, app/, shared/ → 0 résultats
--     hors generated/prisma/).
--   - Symétrique fonctionnel de `reopensAt` (auto-close planifiée) jamais livré.
-- Décision : drop column. Si la feature « fermeture programmée » est
-- relivrée plus tard, ré-introduire le champ + un cron `auto-close-store`.
-- =====================================================================

ALTER TABLE "StoreSettings" DROP COLUMN IF EXISTS "scheduledCloseAt";
