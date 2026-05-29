-- Retrait des colonnes Stripe orphelines (flow Elements / PaymentIntents uniquement).
--   - stripeCheckoutSessionId : jamais peuplée (aucune Checkout Session hosted créée).
--   - stripeInvoiceId : jamais peuplée (Stripe Invoicing non utilisé ; la facturation
--     électronique est gérée séparément via Order.invoiceNumber `F-YYYY-NNNNN`).
-- Les index UNIQUE associés (Order_stripeCheckoutSessionId_key / Order_stripeInvoiceId_key)
-- sont supprimés automatiquement avec leur colonne.
ALTER TABLE "Order"
    DROP COLUMN IF EXISTS "stripeCheckoutSessionId",
    DROP COLUMN IF EXISTS "stripeInvoiceId";
