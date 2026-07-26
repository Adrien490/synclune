-- Rollback de 20260726234500_drop_dead_shipping_columns.
--
-- Restaure les deux colonnes nullable, sans données : `shippingRateId` était NULL
-- partout et `shippingMethod` ne portait que la constante "STANDARD" (à re-poser
-- côté applicatif si le rollback accompagne un retour au code précédent).

ALTER TABLE "Order"
    ADD COLUMN IF NOT EXISTS "shippingMethod" VARCHAR(20),
    ADD COLUMN IF NOT EXISTS "shippingRateId" TEXT;
