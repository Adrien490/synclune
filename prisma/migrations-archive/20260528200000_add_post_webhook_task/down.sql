-- Rollback ORD-STRIPE-003 — PostWebhookTask
-- ATTENTION : perte des tâches PENDING/FAILED non encore exécutées.

ALTER TABLE "PostWebhookTask" DROP CONSTRAINT IF EXISTS "PostWebhookTask_attempts_non_negative";
ALTER TABLE "PostWebhookTask" DROP CONSTRAINT IF EXISTS "PostWebhookTask_webhookEventId_fkey";

DROP INDEX IF EXISTS "PostWebhookTask_webhookEventId_idx";
DROP INDEX IF EXISTS "PostWebhookTask_status_createdAt_idx";
DROP INDEX IF EXISTS "PostWebhookTask_status_attempts_createdAt_idx";
DROP INDEX IF EXISTS "PostWebhookTask_idempotencyKey_key";

DROP TABLE IF EXISTS "PostWebhookTask";

DROP TYPE IF EXISTS "PostWebhookTaskStatus";
