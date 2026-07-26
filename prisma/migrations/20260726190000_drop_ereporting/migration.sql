-- Retrait de l'e-reporting DGFiP (right-sizing 2026-07-26).
--
-- La machinerie e-reporting B2C était en dry-run intégral (aucune Plateforme
-- Agréée branchée, flag INVOICE_ENABLE_EREPORTING toujours OFF) et écrite
-- contre une spécification non figée (arrêté à paraître). L'obligation est au
-- 1ᵉʳ septembre 2027 : le module sera réécrit à ce moment-là contre la spec
-- définitive. Cf. docs/RUNBOOK.md § e-reporting.
--
-- Aucune donnée de production n'est perdue : la boutique n'a jamais été ouverte
-- (ORDERS_AVAILABLE=false) et le flag n'a jamais été activé, donc ces tables
-- sont vides. Les obligations LIVE (facture séquentielle gap-free, PDF immuable,
-- avoirs, rétention 10 ans) ne sont pas touchées.

-- Index DLQ (supprimés avec leurs colonnes, mais explicites pour la lisibilité).
DROP INDEX IF EXISTS "Order_ereportingRetryDeferred_idx";
DROP INDEX IF EXISTS "Refund_ereportingRetryDeferred_idx";

-- Colonnes DLQ e-reporting.
ALTER TABLE "Order" DROP COLUMN IF EXISTS "ereportingRetryDeferred";
ALTER TABLE "Refund" DROP COLUMN IF EXISTS "ereportingRetryDeferred";

-- Tables (ordre : enfants → parents ; les CHECK/EXCLUDE portés par ces tables
-- — EReportingTransaction_source_xor, EReportingPeriod_no_overlap — et le
-- trigger de couplage source/type disparaissent avec elles).
DROP TABLE IF EXISTS "EReportingTransaction";
DROP TABLE IF EXISTS "EReportingBatch";
DROP TABLE IF EXISTS "EReportingPeriod";

-- Enums devenus orphelins. `EReportingOperationCategory` est CONSERVÉ : il
-- reste référencé par ProductType/OrderItem/RefundItem.operationCategory
-- (retiré dans une migration ultérieure).
DROP TYPE IF EXISTS "EReportingTransactionType";
DROP TYPE IF EXISTS "EReportingStatus";
