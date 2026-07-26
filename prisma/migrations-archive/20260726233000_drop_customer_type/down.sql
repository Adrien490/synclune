-- Rollback de 20260726233000_drop_customer_type.
--
-- Restaure l'enum et la colonne à leur valeur par défaut `B2C`. Aucune donnée à
-- restaurer : la colonne n'a jamais eu d'autre valeur (aucun parcours d'achat
-- B2B/B2G n'a jamais existé au checkout).

CREATE TYPE "CustomerType" AS ENUM ('B2C', 'B2B', 'B2G');

ALTER TABLE "Order"
    ADD COLUMN "customerType" "CustomerType" NOT NULL DEFAULT 'B2C';
