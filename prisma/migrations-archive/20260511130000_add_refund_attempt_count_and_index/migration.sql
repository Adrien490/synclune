-- P0.2: idempotency key rotation requires an attempt counter incremented on each retry.
-- Default 0 — existing refunds will use `refund_${id}_0` on first replay, which matches
-- the previous deterministic key `refund_${id}` only if Stripe still holds the cached
-- response (24h window). For old refunds beyond 24h, behaviour is unchanged.
ALTER TABLE "Refund" ADD COLUMN "attemptCount" INTEGER NOT NULL DEFAULT 0;

-- P1.3: index partiel pour le cron reconcile-refunds (APPROVED + stripeRefundId IS NOT NULL).
-- Le cron scan les refunds APPROVED qui ont déjà un stripeRefundId mais pas de processedAt,
-- indiquant un SAGA Step 3 échoué qui doit être réconcilié.
CREATE INDEX "Refund_status_stripeRefundId_idx" ON "Refund"("status", "stripeRefundId");
