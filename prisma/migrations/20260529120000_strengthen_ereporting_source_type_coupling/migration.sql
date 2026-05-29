-- Renforce EReportingTransaction_source_xor : couplage type↔source.
-- Avant : seulement « exactement une FK renseignée » (autorisait SALES+refundId, REFUND+orderId).
-- Après : SALES/PAYMENT ⇒ orderId set & refundId null ; REFUND ⇒ refundId set & orderId null.
-- La nouvelle condition subsume l'ancien XOR (chaque branche force exactement une FK non nulle)
-- ET corrèle la source au type. Backstop DB pour record-ereporting.service.ts (Invariant 9).
ALTER TABLE "EReportingTransaction" DROP CONSTRAINT "EReportingTransaction_source_xor";

ALTER TABLE "EReportingTransaction" ADD CONSTRAINT "EReportingTransaction_source_xor"
    CHECK (
      ("type" IN ('SALES', 'PAYMENT') AND "orderId" IS NOT NULL AND "refundId" IS NULL)
      OR ("type" = 'REFUND' AND "refundId" IS NOT NULL AND "orderId" IS NULL)
    );
