-- Rollback de 20260726193000_drop_operation_category.
--
-- Restaure l'enum et les trois colonnes à leur valeur par défaut `GOODS`.
-- Aucune donnée à restaurer : la colonne n'a jamais eu d'autre valeur que
-- `GOODS` (aucune surface d'édition n'a jamais existé).

CREATE TYPE "EReportingOperationCategory" AS ENUM ('GOODS', 'SERVICES', 'MIXED');

ALTER TABLE "ProductType"
    ADD COLUMN "operationCategory" "EReportingOperationCategory" NOT NULL DEFAULT 'GOODS';
ALTER TABLE "OrderItem"
    ADD COLUMN "operationCategory" "EReportingOperationCategory" NOT NULL DEFAULT 'GOODS';
ALTER TABLE "RefundItem"
    ADD COLUMN "operationCategory" "EReportingOperationCategory" NOT NULL DEFAULT 'GOODS';
