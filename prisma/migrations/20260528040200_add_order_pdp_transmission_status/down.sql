-- Rollback : Order statut transmission PDP
DROP INDEX IF EXISTS "Order_pdpStatus_invoiceGeneratedAt_idx";

ALTER TABLE "Order"
    DROP COLUMN IF EXISTS "pdpProviderRef",
    DROP COLUMN IF EXISTS "pdpRejectionReason",
    DROP COLUMN IF EXISTS "pdpRejectedAt",
    DROP COLUMN IF EXISTS "pdpAcceptedAt",
    DROP COLUMN IF EXISTS "pdpTransmittedAt",
    DROP COLUMN IF EXISTS "pdpStatus";

DROP TYPE IF EXISTS "PdpTransmissionStatus";
