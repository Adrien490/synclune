-- Rollback : payloadHash e-reporting
ALTER TABLE "EReportingTransaction" DROP CONSTRAINT IF EXISTS "EReportingTransaction_payloadHash_format_check";
ALTER TABLE "EReportingTransaction" DROP COLUMN IF EXISTS "payloadHash";
