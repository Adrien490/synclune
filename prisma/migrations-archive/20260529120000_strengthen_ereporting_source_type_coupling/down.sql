-- Rollback : restaure la CHECK source_xor « exactement une FK » sans couplage type.
ALTER TABLE "EReportingTransaction" DROP CONSTRAINT "EReportingTransaction_source_xor";

ALTER TABLE "EReportingTransaction" ADD CONSTRAINT "EReportingTransaction_source_xor"
    CHECK (
      ("orderId" IS NOT NULL AND "refundId" IS NULL)
      OR ("orderId" IS NULL AND "refundId" IS NOT NULL)
    );
