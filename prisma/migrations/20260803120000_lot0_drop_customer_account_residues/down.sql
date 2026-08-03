-- Rollback Lot 0 — recrée la structure, pas les données (les valeurs
-- User.stripeCustomerId, DiscountUsage.userId et OrderNote.isInternal
-- supprimées ne sont pas restaurables ; les User basculés
-- PENDING_DELETION → INACTIVE restent INACTIVE).

-- S2.1 — réintroduire les 6 valeurs PDP_* en fin d'enum (l'ordre exact
-- d'origine n'a pas d'effet applicatif).
ALTER TYPE "OrderAction" ADD VALUE IF NOT EXISTS 'PDP_SUBMITTED';
ALTER TYPE "OrderAction" ADD VALUE IF NOT EXISTS 'PDP_ACCEPTED';
ALTER TYPE "OrderAction" ADD VALUE IF NOT EXISTS 'PDP_REJECTED';
ALTER TYPE "OrderAction" ADD VALUE IF NOT EXISTS 'PDP_RETRY';
ALTER TYPE "OrderAction" ADD VALUE IF NOT EXISTS 'PDP_ABANDONED';
ALTER TYPE "OrderAction" ADD VALUE IF NOT EXISTS 'PDP_CANCELLED';

-- S2.5
ALTER TYPE "AccountStatus" ADD VALUE IF NOT EXISTS 'PENDING_DELETION';

-- S1.5
ALTER TABLE "DiscountUsage" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "DiscountUsage" ADD CONSTRAINT "DiscountUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "DiscountUsage_discountId_userId_idx" ON "DiscountUsage"("discountId", "userId");
CREATE INDEX IF NOT EXISTS "DiscountUsage_userId_idx" ON "DiscountUsage"("userId");

-- S1.4
ALTER TABLE "OrderNote" ADD COLUMN IF NOT EXISTS "isInternal" BOOLEAN NOT NULL DEFAULT false;

-- S1.1 (VARCHAR(50) : état post-20260730140000_bound_owned_string_columns)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "stripeCustomerId" VARCHAR(50);
CREATE UNIQUE INDEX IF NOT EXISTS "User_stripeCustomerId_key" ON "User"("stripeCustomerId");

-- S1.3
CREATE INDEX IF NOT EXISTS "Order_userId_createdAt_idx" ON "Order"("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Order_userId_status_createdAt_idx" ON "Order"("userId", "status", "createdAt" DESC);

-- S1.2
CREATE INDEX IF NOT EXISTS "User_role_deletedAt_idx" ON "User"("role", "deletedAt");
CREATE INDEX IF NOT EXISTS "User_deletedAt_suspendedAt_idx" ON "User"("deletedAt", "suspendedAt");
