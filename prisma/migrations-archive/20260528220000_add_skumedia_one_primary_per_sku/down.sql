-- Rollback for 20260528220000_add_skumedia_one_primary_per_sku
-- Removes the partial unique index guaranteeing one primary image per SKU.
-- Prisma does not run down migrations automatically — apply manually via psql:
--   psql $DATABASE_URL -f down.sql
--
-- Note : le dédoublonnage des images primaires (UPDATE de la migration up) n'est
-- PAS réversible (l'information "quelles images étaient primaires" est perdue).
-- Ce down.sql ne restaure donc que l'absence de contrainte.

DROP INDEX IF EXISTS "SkuMedia_one_primary_per_sku";
