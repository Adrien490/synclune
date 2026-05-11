-- Add index on Collection.status for filter + groupBy queries.
--
-- Used by:
--   - getPublicCollectionSlugs (WHERE status = 'PUBLIC') — runs at build for generateStaticParams
--   - getCollectionOptions (WHERE status IN ('DRAFT', 'PUBLIC'))
--   - getCollectionCountsByStatus (groupBy status) — admin dashboard
--   - sitemap.ts + /collections page filter (status = 'PUBLIC', hasProducts = true)
--
-- Production note: prefer `CREATE INDEX CONCURRENTLY` in a maintenance window.
-- Prisma migrate does not support CONCURRENTLY; if applicable, run by hand and
-- `prisma migrate resolve --applied 20260510193020_add_collection_status_index`.

CREATE INDEX "Collection_status_idx" ON "Collection"("status");
