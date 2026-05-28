-- Rollback : CHECK SHA-256 sur les hashes PDF (EINV-PRISMA-002)
ALTER TABLE "Refund" DROP CONSTRAINT IF EXISTS "Refund_creditNotePdfHash_format_check";
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_creditNotePdfHash_format_check";
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_invoicePdfHash_format_check";
