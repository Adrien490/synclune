-- P1: Add missing paidAt index for dashboard KPIs, revenue chart, recent orders, CSV export
-- 8+ queries do full scans on paidAt (get-kpis, get-revenue-chart, get-recent-orders, export-orders-csv)
CREATE INDEX "Order_paidAt_idx" ON "Order" ("paidAt" DESC);

-- P4: Remove redundant processedAt single-column index on WebhookEvent
-- All queries filter by status + processedAt, covered by the composite index
DROP INDEX IF EXISTS "WebhookEvent_processedAt_idx";

-- P5: Remove unused status/dueBy index on Dispute
-- Dashboard disputes view does not exist yet, premature index for very low volume table
DROP INDEX IF EXISTS "Dispute_status_dueBy_idx";
