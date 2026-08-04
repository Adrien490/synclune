-- Rollback du Lot C de l'audit schéma V1 (2026-08-05).
--
-- ⚠️ Recrée la STRUCTURE, pas les DONNÉES. En particulier les lignes `RefundItem`
-- sont définitivement perdues — mais elles étaient FABRIQUÉES (répartition
-- pro-rata d'un montant Stripe sur des lignes de commande), donc rien
-- d'irremplaçable : le montant réel de chaque remboursement vit dans
-- `Refund.amount`, qui n'est pas touché. Pour un retour arrière avec données,
-- passer par le PITR Neon.

-- ---------------------------------------------------------------------------
-- 4. Index composites d'`Order`
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS "Order_customerEmail_idx" ON "Order"("customerEmail");
CREATE INDEX IF NOT EXISTS "Order_paymentStatus_createdAt_idx" ON "Order"("paymentStatus", "createdAt");
CREATE INDEX IF NOT EXISTS "Order_paymentStatus_deletedAt_paidAt_idx" ON "Order"("paymentStatus", "deletedAt", "paidAt" DESC);
CREATE INDEX IF NOT EXISTS "Order_unpaid_pii_purge_idx" ON "Order"("piiPurgedAt", "paidAt", "createdAt");
CREATE INDEX IF NOT EXISTS "Order_overbilling_unresolved_idx" ON "Order"("overbillingResolvedAt", "overbilledAmountCents");

-- ---------------------------------------------------------------------------
-- 3. currency
-- ---------------------------------------------------------------------------
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "currency" VARCHAR(3) NOT NULL DEFAULT 'EUR';
ALTER TABLE "Refund" ADD COLUMN IF NOT EXISTS "currency" VARCHAR(3) NOT NULL DEFAULT 'EUR';
ALTER TABLE "Order" ADD CONSTRAINT "Order_currency_eur_check" CHECK (currency = 'EUR');
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_currency_eur_check" CHECK (currency = 'EUR');

-- ---------------------------------------------------------------------------
-- 2. Order.userId
--
-- Revient NULL partout, ce qui est exactement l'état qu'elle avait avant le drop
-- (achat 100 % invité) : l'application reste cohérente après rollback.
-- ---------------------------------------------------------------------------
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- 1. RefundItem
-- ---------------------------------------------------------------------------
CREATE TABLE "RefundItem" (
    "id" TEXT NOT NULL,
    "refundId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RefundItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RefundItem_refundId_idx" ON "RefundItem"("refundId");
CREATE INDEX "RefundItem_orderItemId_idx" ON "RefundItem"("orderItemId");

ALTER TABLE "RefundItem" ADD CONSTRAINT "RefundItem_refundId_fkey"
  FOREIGN KEY ("refundId") REFERENCES "Refund"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RefundItem" ADD CONSTRAINT "RefundItem_orderItemId_fkey"
  FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RefundItem" ADD CONSTRAINT "RefundItem_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "RefundItem" ADD CONSTRAINT "RefundItem_quantity_positive" CHECK ("quantity" >= 1);
