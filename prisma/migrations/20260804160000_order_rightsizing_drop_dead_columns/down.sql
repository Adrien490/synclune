-- Rollback du dégraissage d'`Order`.
--
-- ⚠️ Restaure la STRUCTURE, pas les données : les valeurs des 16 colonnes sont
-- perdues par le DROP. C'est sans conséquence — aucune ne portait d'information
-- reconstituable ni exigée par la conservation légale : `taxAmount` valait
-- toujours 0 (franchise Art. 293 B, exclue de `Order_total_formula`), les neuf
-- `billing*` et `customerPhone` étaient NULL sur toute commande réelle, et les
-- trois `paymentFailure*` étaient du diagnostic dupliqué du dashboard Stripe.
-- L'identité de facturation reste portée par `invoiceDataSnapshot` (figé sous
-- SHA-256) et par le PDF archivé, tous deux intacts.

ALTER TABLE "Order"
  ADD COLUMN "stripeCustomerId" VARCHAR(50),
  ADD COLUMN "customerPhone" VARCHAR(20),
  ADD COLUMN "taxAmount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "paymentFailureCode" VARCHAR(100),
  ADD COLUMN "paymentDeclineCode" VARCHAR(100),
  ADD COLUMN "paymentFailureMessage" VARCHAR(500),
  ADD COLUMN "invoiceArchivedAt" TIMESTAMP(3),
  ADD COLUMN "billingSameAsShipping" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "billingFirstName" VARCHAR(50),
  ADD COLUMN "billingLastName" VARCHAR(50),
  ADD COLUMN "billingAddress1" VARCHAR(255),
  ADD COLUMN "billingAddress2" VARCHAR(255),
  ADD COLUMN "billingPostalCode" VARCHAR(10),
  ADD COLUMN "billingCity" VARCHAR(100),
  ADD COLUMN "billingCountry" VARCHAR(2),
  ADD COLUMN "billingPhone" VARCHAR(20);

ALTER TABLE "Order" ADD CONSTRAINT "Order_taxAmount_non_negative" CHECK ("taxAmount" >= 0);

DROP INDEX IF EXISTS "Order_invoiceStatus_idx";
CREATE INDEX "Order_invoiceStatus_invoicePdfUrl_idx" ON "Order"("invoiceStatus", "invoiceArchivedAt");
CREATE INDEX "Order_stripeCustomerId_idx" ON "Order"("stripeCustomerId");
