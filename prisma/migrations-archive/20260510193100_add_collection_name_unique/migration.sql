-- Add UNIQUE constraint on Collection.name.
--
-- Reason: createCollection / updateCollection were checking name uniqueness via
-- a non-atomic findFirst → throw inside a transaction. Two concurrent admins
-- could create collections with the same name (READ COMMITTED isolation).
-- The DB-level UNIQUE makes the invariant atomic and lets the actions catch
-- Prisma error P2002 instead of pre-checking.
--
-- Production prerequisite: ensure zero duplicate names exist before applying.
-- Run the following audit SQL first:
--   SELECT name, COUNT(*) FROM "Collection" GROUP BY name HAVING COUNT(*) > 1;
-- If duplicates are found, deduplicate manually before running this migration
-- (e.g. rename oldest occurrence with a suffix and update the slug history).
--
-- Production note: prefer `CREATE UNIQUE INDEX CONCURRENTLY` then promote to
-- a constraint, in a maintenance window. Prisma migrate does not support
-- CONCURRENTLY; if applicable, run by hand and `prisma migrate resolve
-- --applied 20260510193100_add_collection_name_unique`.

CREATE UNIQUE INDEX "Collection_name_key" ON "Collection"("name");
