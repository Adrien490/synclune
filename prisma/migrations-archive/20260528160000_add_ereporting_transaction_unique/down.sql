-- Rollback : retire les unique indexes EINV-GLOBAL-013.
DROP INDEX IF EXISTS "EReportingTransaction_orderId_type_key";
DROP INDEX IF EXISTS "EReportingTransaction_refundId_type_key";
