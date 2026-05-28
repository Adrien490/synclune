-- EINV-GLOBAL-013 : anti-doublon e-reporting au niveau DB.
-- Postgres traite NULL comme distinct dans un index unique :
--   - SALES/PAYMENT : orderId set, refundId null → unique(orderId, type)
--   - REFUND        : orderId null, refundId set → unique(refundId, type)
-- La CHECK constraint EReportingTransaction_source_xor (migration 20260528032416)
-- garantit déjà l'XOR strict entre orderId et refundId. La paire (X, type) ne
-- peut donc collisionner qu'à l'intérieur de son flow d'origine.

CREATE UNIQUE INDEX "EReportingTransaction_orderId_type_key"
    ON "EReportingTransaction" ("orderId", "type");

CREATE UNIQUE INDEX "EReportingTransaction_refundId_type_key"
    ON "EReportingTransaction" ("refundId", "type");
