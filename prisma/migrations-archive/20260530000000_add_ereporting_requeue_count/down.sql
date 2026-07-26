-- Rollback : retire le cap anti-boucle de re-rejet.
ALTER TABLE "EReportingTransaction" DROP CONSTRAINT "EReportingTransaction_requeueCount_non_negative";

ALTER TABLE "EReportingTransaction" DROP COLUMN "requeueCount";
