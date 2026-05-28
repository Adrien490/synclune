-- ============================================================================
-- Refund.confirmationEmailSentAt — dédup cross-instance email refund
-- ORD-STRIPE-005 (2026-05-28)
-- ============================================================================
--
-- Contexte :
--   Trois chemins envoient l'email de confirmation de remboursement client :
--     1. SAGA admin `processRefund` (clé Resend `refund-confirm-{id}-{attempt}`)
--     2. Webhook `charge.refunded` (clé `refund-confirm-charge-{cid}-{amount}`)
--     3. Cron `reconcile-refunds` (clé encore différente)
--
--   Les 3 clés ne se croisent jamais → Resend n'a aucune dédup applicative
--   transversale → email envoyé jusqu'à 3 fois pour le même refund (incident).
--
--   Ce flag DB est posé atomiquement par le 1er call-site qui envoie. Les
--   autres skip l'envoi. Permet retry sur Resend 5xx (champ reste NULL).
-- ============================================================================

ALTER TABLE "Refund"
    ADD COLUMN "confirmationEmailSentAt" TIMESTAMP(3);
