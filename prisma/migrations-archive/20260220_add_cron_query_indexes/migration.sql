-- Indexes for cron job queries that currently do sequential scans
-- These will improve performance as tables grow beyond 10k+ rows

-- sync-async-payments: queries Order by paymentStatus + createdAt
CREATE INDEX "Order_paymentStatus_createdAt_idx" ON "Order"("paymentStatus", "createdAt");

-- review-request-emails: queries Order by fulfillmentStatus + actualDelivery
CREATE INDEX "Order_fulfillmentStatus_actualDelivery_idx" ON "Order"("fulfillmentStatus", "actualDelivery");

-- reconcile-refunds: queries Refund by status + processedAt
CREATE INDEX "Refund_status_processedAt_idx" ON "Refund"("status", "processedAt");

-- cleanup-webhook-events: queries SKIPPED/stale WebhookEvent by status + receivedAt
CREATE INDEX "WebhookEvent_status_receivedAt_idx" ON "WebhookEvent"("status", "receivedAt");
