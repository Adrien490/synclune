-- Retrait de `operationCategory` (suite du retrait e-reporting, right-sizing 2026-07-26).
--
-- L'enum `EReportingOperationCategory` n'existait que pour la ventilation
-- biens/services de l'e-reporting DGFiP (migration 20260726190000). Il n'a
-- JAMAIS été éditable : aucune surface admin ne l'expose, la valeur vaut
-- toujours `GOODS` (Synclune vend des biens physiques, en franchise de TVA).
--
-- L'arbitrage biens vs services à la sortie de franchise reste un sujet
-- comptable, pas un champ de base : il sera réintroduit avec l'e-reporting
-- si l'arrêté définitif l'exige.

ALTER TABLE "ProductType" DROP COLUMN IF EXISTS "operationCategory";
ALTER TABLE "OrderItem"   DROP COLUMN IF EXISTS "operationCategory";
ALTER TABLE "RefundItem"  DROP COLUMN IF EXISTS "operationCategory";

DROP TYPE IF EXISTS "EReportingOperationCategory";
