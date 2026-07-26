-- Add `clickAndCollectEnabled` boolean to StoreSettings.
--
-- Feature gate pour le mode CLICK_AND_COLLECT (retrait boutique) côté checkout.
-- `false` par défaut tant que l'infra logistique n'est pas opérationnelle.
-- Validé runtime dans `modules/cart/actions/set-fulfillment-mode.ts`.
--
-- Migration atomique : ALTER TABLE ADD COLUMN avec DEFAULT false. Postgres applique
-- la valeur par défaut sur les rows existantes sans rewrite full-table (Postgres 11+).
ALTER TABLE "StoreSettings" ADD COLUMN "clickAndCollectEnabled" BOOLEAN NOT NULL DEFAULT false;
