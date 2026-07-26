-- ============================================================================
-- PostWebhookTask : persistance des tâches post-webhook pour retry
-- ORD-STRIPE-003 (2026-05-28)
-- ============================================================================
--
-- Contexte :
--   Les tâches post-webhook (emails de confirmation, invalidation cache) sont
--   exécutées via `after()` APRÈS le 200 retourné à Stripe. Sans persistance,
--   un crash de la lambda Vercel = tâches perdues + Stripe ne re-livre pas
--   (200 déjà ACK). Conséquence : emails de confirmation perdus, support++.
--
--   Cette migration introduit une table queue persistante :
--     1. Lors du dispatch, les tâches sont créées en PENDING dans la MÊME tx
--        que WebhookEvent.status=COMPLETED.
--     2. Le runner `after()` les exécute et marque COMPLETED/FAILED.
--     3. Le cron `retry-post-webhook-tasks` (5min) repop PENDING + FAILED dont
--        attempts < MAX_POST_WEBHOOK_RETRY_ATTEMPTS.
--
--   `idempotencyKey` (unique) permet la dédup applicative : un même refund
--   confirmation envoyé via 3 chemins (SAGA / webhook / cron) ne crée qu'une
--   seule task (P2002 catch côté createMany skipDuplicates=true).
-- ============================================================================

CREATE TYPE "PostWebhookTaskStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

CREATE TABLE "PostWebhookTask" (
    "id" TEXT NOT NULL,
    "webhookEventId" TEXT,
    "taskType" VARCHAR(60) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "PostWebhookTaskStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "idempotencyKey" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    CONSTRAINT "PostWebhookTask_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PostWebhookTask_idempotencyKey_key" ON "PostWebhookTask"("idempotencyKey");
CREATE INDEX "PostWebhookTask_status_attempts_createdAt_idx" ON "PostWebhookTask"("status", "attempts", "createdAt");
CREATE INDEX "PostWebhookTask_status_createdAt_idx" ON "PostWebhookTask"("status", "createdAt");
CREATE INDEX "PostWebhookTask_webhookEventId_idx" ON "PostWebhookTask"("webhookEventId");

ALTER TABLE "PostWebhookTask"
    ADD CONSTRAINT "PostWebhookTask_webhookEventId_fkey"
    FOREIGN KEY ("webhookEventId")
    REFERENCES "WebhookEvent"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;

-- Garde-fous : attempts >= 0 (cron pourrait corrompre par erreur)
ALTER TABLE "PostWebhookTask"
    ADD CONSTRAINT "PostWebhookTask_attempts_non_negative"
    CHECK ("attempts" >= 0);
