-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'GENERATED', 'VOIDED');

-- CreateEnum
CREATE TYPE "FailedEmailStatus" AS ENUM ('PENDING', 'RETRIED', 'EXHAUSTED');

-- AlterEnum
ALTER TYPE "OrderAction" ADD VALUE 'INVOICE_GENERATED';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "stripeInvoiceId" TEXT,
ADD COLUMN "invoiceNumber" VARCHAR(30),
ADD COLUMN "invoiceStatus" "InvoiceStatus",
ADD COLUMN "invoiceGeneratedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "FailedEmail" (
    "id" TEXT NOT NULL,
    "to" VARCHAR(255) NOT NULL,
    "subject" VARCHAR(500) NOT NULL,
    "template" VARCHAR(100) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "FailedEmailStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FailedEmail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Order_stripeInvoiceId_key" ON "Order"("stripeInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_invoiceNumber_key" ON "Order"("invoiceNumber");

-- CreateIndex
CREATE INDEX "FailedEmail_status_createdAt_idx" ON "FailedEmail"("status", "createdAt");
