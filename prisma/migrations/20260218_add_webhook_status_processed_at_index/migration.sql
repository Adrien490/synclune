-- CreateIndex
CREATE INDEX "WebhookEvent_status_processedAt_idx" ON "WebhookEvent"("status", "processedAt");
