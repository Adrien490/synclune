-- EINV-EREPORT-007/F3 — Catégorie d'opération e-reporting sur ProductType + snapshot OrderItem.
--
-- DORMANT / zéro régression : défaut GOODS = réalité Synclune (bijoux = biens). L'échappatoire
-- (taguer un ProductType en SERVICES à la sortie de franchise) permettra de dériver la bonne
-- catégorie e-reporting sans toucher au hot path. Le snapshot OrderItem fige la catégorie au
-- moment de la vente (immuabilité comptable, cf. autres snapshots de ligne).
--
-- Le type ENUM "EReportingOperationCategory" existe déjà (migration 20260529140000).

ALTER TABLE "ProductType"
    ADD COLUMN "operationCategory" "EReportingOperationCategory" NOT NULL DEFAULT 'GOODS';

ALTER TABLE "OrderItem"
    ADD COLUMN "operationCategory" "EReportingOperationCategory" NOT NULL DEFAULT 'GOODS';
