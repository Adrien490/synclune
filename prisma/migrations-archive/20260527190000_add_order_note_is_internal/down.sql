-- Rollback for 20260527190000_add_order_note_is_internal
-- Removes the isInternal column from OrderNote. Prisma does not run down
-- migrations automatically -- apply manually via psql:
--   psql $DATABASE_URL -f down.sql

DROP INDEX IF EXISTS "OrderNote_orderId_isInternal_idx";

ALTER TABLE "OrderNote" DROP COLUMN IF EXISTS "isInternal";
