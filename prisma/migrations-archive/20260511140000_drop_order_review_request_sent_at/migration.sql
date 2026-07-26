-- =====================================================================
-- Drop dead column Order.reviewRequestSentAt + associated composite index
-- =====================================================================
-- Audit reviews 2026-05-11 P1.1 (Option B) :
--   - Le champ Order.reviewRequestSentAt n'est écrit par aucun code applicatif
--     (vérifié : grep dans modules/ + app/api/ → 0 résultats hors generated/seed).
--   - L'index composite [fulfillmentStatus, actualDelivery, reviewRequestSentAt, deletedAt]
--     a été créé pour un cron `review-request-emails` jamais livré.
--   - Le service `reviews/services/send-review-request-email.service.ts` référencé
--     dans docs/audit/01-conventions.md n'existe pas non plus.
-- Décision : drop column + index. Si la feature email "donnez votre avis" est
-- relivrée plus tard, ré-introduire le flag dans une nouvelle migration.
-- =====================================================================

DROP INDEX IF EXISTS "Order_fulfillmentStatus_actualDelivery_reviewRequestSentAt_d_idx";

ALTER TABLE "Order" DROP COLUMN IF EXISTS "reviewRequestSentAt";
