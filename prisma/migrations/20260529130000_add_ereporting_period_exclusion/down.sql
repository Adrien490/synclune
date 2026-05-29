-- Rollback EINV-EREPORT-006 : retire le rattachement période + la table
-- EReportingPeriod et ses contraintes. (Aucune extension à drop : btree_gist
-- n'a pas été créée — tsrange && utilise le support gist natif des range types.)

ALTER TABLE "EReportingBatch" DROP CONSTRAINT IF EXISTS "EReportingBatch_periodId_fkey";
DROP INDEX IF EXISTS "EReportingBatch_periodId_idx";
ALTER TABLE "EReportingBatch" DROP COLUMN IF EXISTS "periodId";

ALTER TABLE "EReportingPeriod" DROP CONSTRAINT IF EXISTS "EReportingPeriod_no_overlap";
ALTER TABLE "EReportingPeriod" DROP CONSTRAINT IF EXISTS "EReportingPeriod_period_order";
DROP INDEX IF EXISTS "EReportingPeriod_periodFrom_periodTo_idx";
DROP INDEX IF EXISTS "EReportingPeriod_periodFrom_key";
DROP TABLE IF EXISTS "EReportingPeriod";
