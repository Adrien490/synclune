-- Rollback : ventilation TVA + catégorie d'opération e-reporting (EINV-EREPORT-007).
ALTER TABLE "EReportingBatch" DROP CONSTRAINT IF EXISTS "EReportingBatch_vatBreakdown_isarray";
ALTER TABLE "EReportingTransaction" DROP CONSTRAINT IF EXISTS "EReportingTransaction_vatBreakdown_isarray";

ALTER TABLE "EReportingBatch" DROP COLUMN IF EXISTS "vatBreakdown";
ALTER TABLE "EReportingTransaction"
    DROP COLUMN IF EXISTS "operationCategory",
    DROP COLUMN IF EXISTS "vatBreakdown";

DROP TYPE IF EXISTS "EReportingOperationCategory";
