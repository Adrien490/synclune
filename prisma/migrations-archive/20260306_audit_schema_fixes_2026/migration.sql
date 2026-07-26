-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.

ALTER TYPE "OrderAction" ADD VALUE 'REFUND_CREATED';
ALTER TYPE "OrderAction" ADD VALUE 'REFUND_COMPLETED';
ALTER TYPE "OrderAction" ADD VALUE 'REFUND_FAILED';
ALTER TYPE "OrderAction" ADD VALUE 'DISPUTE_OPENED';
ALTER TYPE "OrderAction" ADD VALUE 'DISPUTE_RESOLVED';
ALTER TYPE "OrderAction" ADD VALUE 'INVOICE_VOIDED';

-- AlterTable
ALTER TABLE "AuditLog" ALTER COLUMN "targetId" SET DATA TYPE VARCHAR(36);

-- CreateIndex
CREATE INDEX "OrderHistory_authorId_idx" ON "OrderHistory"("authorId");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

-- CreateIndex
CREATE INDEX "Refund_createdBy_idx" ON "Refund"("createdBy");
