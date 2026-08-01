-- Rollback : recrée le modèle Dispute tel que défini par 0_init (DDL + gardes bruts).
CREATE TYPE "DisputeStatus" AS ENUM ('NEEDS_RESPONSE', 'UNDER_REVIEW', 'WON', 'LOST', 'CHARGE_REFUNDED');

CREATE TYPE "DisputeReason" AS ENUM ('DUPLICATE', 'FRAUDULENT', 'SUBSCRIPTION_CANCELED', 'PRODUCT_UNACCEPTABLE', 'PRODUCT_NOT_RECEIVED', 'UNRECOGNIZED', 'CREDIT_NOT_PROCESSED', 'GENERAL');

CREATE TABLE "Dispute" (
    "id" TEXT NOT NULL,
    "stripeDisputeId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "fee" INTEGER NOT NULL DEFAULT 0,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'EUR',
    "reason" "DisputeReason" NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'NEEDS_RESPONSE',
    "dueBy" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Dispute_stripeDisputeId_key" ON "Dispute"("stripeDisputeId");

CREATE INDEX "Dispute_orderId_idx" ON "Dispute"("orderId");

ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_currency_eur_check" CHECK (currency = 'EUR');
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_fee_non_negative" CHECK ("fee" >= 0);
