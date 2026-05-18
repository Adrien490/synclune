-- Rollback for 20251124_add_inventory_non_negative_constraint
-- Removes the CHECK constraint on ProductSku.inventory.
-- Prisma does not run down migrations automatically — apply manually via psql:
--   psql $DATABASE_URL -f down.sql

ALTER TABLE "ProductSku" DROP CONSTRAINT IF EXISTS "ProductSku_inventory_non_negative";
