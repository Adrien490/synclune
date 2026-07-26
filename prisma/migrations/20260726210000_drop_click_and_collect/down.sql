-- Rollback de 20260726210000_drop_click_and_collect.
--
-- Restaure l'enum et les deux colonnes à leur valeur par défaut. Aucune donnée
-- à restaurer : `fulfillmentType` valait toujours `SHIPPING` et
-- `clickAndCollectEnabled` toujours `false` (surface jamais activée).

CREATE TYPE "CartFulfillmentType" AS ENUM ('SHIPPING', 'CLICK_AND_COLLECT');

ALTER TABLE "Cart"
    ADD COLUMN "fulfillmentType" "CartFulfillmentType" NOT NULL DEFAULT 'SHIPPING';
ALTER TABLE "StoreSettings"
    ADD COLUMN "clickAndCollectEnabled" BOOLEAN NOT NULL DEFAULT false;
