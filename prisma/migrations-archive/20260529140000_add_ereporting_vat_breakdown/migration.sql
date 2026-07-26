-- ============================================================================
-- Ventilation TVA + catégorie d'opération e-reporting B2C (DORMANT)
-- Préparation à la sortie de franchise (TVA ≠ 0). EINV-EREPORT-007.
-- ============================================================================
--
-- Constat : EReportingTransaction.taxAmount / EReportingBatch.totalTaxAmount sont
-- des scalaires uniques → impossible de ventiler un panier multi-taux (20 % +
-- 5,5 %) ni de distinguer livraison de biens / prestation de services. Neutralisé
-- par la franchise art. 293 B (TVA = 0) aujourd'hui, bloquant à la sortie.
--
-- Design (KISS, Invariant 9 préservé — aucune nouvelle table EReporting*, donc
-- aucune nouvelle surface d'écriture) :
--   - vatBreakdown JSONB : tableau `[{ rate, baseExclTax, taxAmount }]` (rate en
--     points de base, ex 2000 = 20 %). null en franchise. Data-driven : AUCUN taux
--     n'est codé ici — les taux viendront de la donnée source à l'activation.
--   - operationCategory : enum GOODS (défaut) / SERVICES / MIXED.
--
-- ⚠️ Valeurs réglementaires NON figées : la granularité exacte de la ventilation
-- TVA et la liste des catégories d'opération de l'e-reporting B2C restent à
-- confirmer contre l'arrêté final / la spec de la PA. L'enum et le format JSON
-- sont des hypothèses de travail configurables.
-- ============================================================================

-- Enum catégorie d'opération.
CREATE TYPE "EReportingOperationCategory" AS ENUM ('GOODS', 'SERVICES', 'MIXED');

-- EReportingTransaction : ventilation + catégorie.
ALTER TABLE "EReportingTransaction"
    ADD COLUMN "vatBreakdown"      JSONB,
    ADD COLUMN "operationCategory" "EReportingOperationCategory" NOT NULL DEFAULT 'GOODS';

-- EReportingBatch : ventilation agrégée (somme par taux des transactions).
ALTER TABLE "EReportingBatch"
    ADD COLUMN "vatBreakdown" JSONB;

-- CHECK (non exprimable en Prisma) : si renseigné, vatBreakdown est un tableau JSON.
-- La cohérence Σ(lignes) = totaux est validée côté application (Zod) — non
-- exprimable proprement en CHECK sur JSONB.
ALTER TABLE "EReportingTransaction"
    ADD CONSTRAINT "EReportingTransaction_vatBreakdown_isarray"
    CHECK ("vatBreakdown" IS NULL OR jsonb_typeof("vatBreakdown") = 'array');

ALTER TABLE "EReportingBatch"
    ADD CONSTRAINT "EReportingBatch_vatBreakdown_isarray"
    CHECK ("vatBreakdown" IS NULL OR jsonb_typeof("vatBreakdown") = 'array');
