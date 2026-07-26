-- Rollback for 20260726160000_add_sku_media_dimensions
-- Drops the SkuMedia.width/height columns and their CHECK constraint.
-- Prisma does not run down migrations automatically — apply manually via psql:
--   psql $DATABASE_URL -f down.sql

ALTER TABLE "SkuMedia" DROP CONSTRAINT IF EXISTS "SkuMedia_dimensions_positive";
ALTER TABLE "SkuMedia" DROP COLUMN IF EXISTS "height";
ALTER TABLE "SkuMedia" DROP COLUMN IF EXISTS "width";
