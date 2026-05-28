-- Rollback ORD-STRIPE-005
ALTER TABLE "Refund" DROP COLUMN IF EXISTS "confirmationEmailSentAt";
