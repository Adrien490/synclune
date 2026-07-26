-- Retrait de `Order.shippingMethod` et `Order.shippingRateId`
-- (right-sizing — audit schéma 2026-07-26, finding F3).
--
-- `shippingRateId` : JAMAIS écrit, JAMAIS lu. Vestige des Stripe Shipping Rates,
-- abandonnées avec le flow Checkout Session hosted (le flow actuel est Elements /
-- PaymentIntents, et les frais de port sont calculés côté application).
--
-- `shippingMethod` : écrit en dur `"STANDARD"` par order-creation.service, jamais lu
-- nulle part. Aucun parcours de choix de mode de livraison n'existe (une seule option
-- d'expédition, plus de click-and-collect depuis le right-sizing 20260726210000).
-- Le transporteur RÉEL — celui qui compte, saisi à l'expédition — est
-- `shippingCarrier`, conservé.
--
-- Aucune perte d'information : `shippingRateId` est NULL sur toutes les lignes et
-- `shippingMethod` ne porte qu'une constante.

ALTER TABLE "Order"
    DROP COLUMN IF EXISTS "shippingMethod",
    DROP COLUMN IF EXISTS "shippingRateId";
