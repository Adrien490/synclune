-- Rollback EINV-EREPORT-007/F3 — retire les colonnes operationCategory.
-- Le type ENUM "EReportingOperationCategory" est conservé (partagé avec EReportingTransaction).

ALTER TABLE "OrderItem" DROP COLUMN "operationCategory";
ALTER TABLE "ProductType" DROP COLUMN "operationCategory";
