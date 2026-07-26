-- Add composite index on Order(userId, status, createdAt DESC).
--
-- Used by:
--   - Espace client "mes commandes" filtré par statut (fetchUserOrders + getUserOrders)
--
-- Without this index, queries scan the existing (userId, createdAt DESC) index
-- then filter by status in-memory — fine today, but grows linearly with order
-- count per user.
--
-- Production note: prefer `CREATE INDEX CONCURRENTLY` in a maintenance window
-- on a live table. Prisma migrate does not support CONCURRENTLY; if applicable,
-- run by hand and
-- `prisma migrate resolve --applied 20260511103600_add_order_user_status_createdat_index`.

CREATE INDEX "Order_userId_status_createdAt_idx" ON "Order"("userId", "status", "createdAt" DESC);
