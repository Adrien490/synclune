-- ============================================================================
-- P1: Add missing composite indexes for admin performance
-- ============================================================================

-- Order: filtrage admin par statut commande + tri chronologique
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt" DESC);

-- Product: filtrage catalogue par statut + tri chronologique
CREATE INDEX "Product_status_createdAt_idx" ON "Product"("status", "createdAt" DESC);

-- Refund: tri chronologique remboursements (page admin)
CREATE INDEX "Refund_createdAt_idx" ON "Refund"("createdAt" DESC);

-- DiscountUsage: lookup usage par utilisateur (verification limite promo/user)
CREATE INDEX "DiscountUsage_userId_idx" ON "DiscountUsage"("userId");

-- ============================================================================
-- P2: Fix RefundItem.refundId — SetNull → Restrict (non-nullable)
-- Un RefundItem orphelin (sans Refund) perd tout contexte.
-- Les Refund ne sont jamais supprimes physiquement (soft delete uniquement).
-- ============================================================================

-- Safety: verify no orphan RefundItems exist before making column non-nullable
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "RefundItem" WHERE "refundId" IS NULL) THEN
    RAISE EXCEPTION 'Cannot make refundId non-nullable: orphan RefundItems with NULL refundId exist. Clean up data first.';
  END IF;
END $$;

-- Make refundId non-nullable
ALTER TABLE "RefundItem" ALTER COLUMN "refundId" SET NOT NULL;

-- Drop the old FK constraint and recreate with RESTRICT
ALTER TABLE "RefundItem" DROP CONSTRAINT IF EXISTS "RefundItem_refundId_fkey";
ALTER TABLE "RefundItem" ADD CONSTRAINT "RefundItem_refundId_fkey"
  FOREIGN KEY ("refundId") REFERENCES "Refund"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
