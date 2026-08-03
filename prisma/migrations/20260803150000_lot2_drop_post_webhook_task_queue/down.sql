-- Rollback Lot 2 S3.4 — recrée la structure (pas les données : les tâches en
-- file étaient des artefacts d'exécution éphémères).

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
    "lastAttemptAt" TIMESTAMP(3),

    CONSTRAINT "PostWebhookTask_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PostWebhookTask_idempotencyKey_key" ON "PostWebhookTask"("idempotencyKey");
CREATE INDEX "PostWebhookTask_status_attempts_createdAt_idx" ON "PostWebhookTask"("status", "attempts", "createdAt");
CREATE INDEX "PostWebhookTask_status_attempts_lastAttemptAt_idx" ON "PostWebhookTask"("status", "attempts", "lastAttemptAt");
CREATE INDEX "PostWebhookTask_status_createdAt_idx" ON "PostWebhookTask"("status", "createdAt");
CREATE INDEX "PostWebhookTask_webhookEventId_idx" ON "PostWebhookTask"("webhookEventId");

ALTER TABLE "PostWebhookTask" ADD CONSTRAINT "PostWebhookTask_webhookEventId_fkey" FOREIGN KEY ("webhookEventId") REFERENCES "WebhookEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PostWebhookTask" ADD CONSTRAINT "PostWebhookTask_attempts_non_negative" CHECK ("attempts" >= 0);
