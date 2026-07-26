-- Rollback : retire la colonne processingStartedAt de WebhookEvent.
ALTER TABLE "WebhookEvent" DROP COLUMN IF EXISTS "processingStartedAt";
