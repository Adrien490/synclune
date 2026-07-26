-- Rollback : retire la colonne updatedAt de EReportingTransaction.
ALTER TABLE "EReportingTransaction" DROP COLUMN IF EXISTS "updatedAt";
