-- Rollback : retire lastAttemptAt (et son index) de PostWebhookTask.
DROP INDEX IF EXISTS "PostWebhookTask_status_attempts_lastAttemptAt_idx";
ALTER TABLE "PostWebhookTask" DROP COLUMN IF EXISTS "lastAttemptAt";
