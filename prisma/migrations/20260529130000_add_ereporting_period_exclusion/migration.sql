-- ============================================================================
-- EReportingPeriod : unité réglementaire de non-recouvrement e-reporting B2C
-- (EINV-EREPORT-006 — 2026-05-29)
-- ============================================================================
--
-- Contexte :
--   `EReportingBatch.periodFrom/periodTo` étaient des DateTime libres : AUCUNE
--   contrainte DB n'empêchait deux batches de couvrir des périodes qui se
--   chevauchent (double déclaration DGFiP).
--
--   Cette migration introduit `EReportingPeriod` comme unité réglementaire de
--   non-recouvrement, portant une EXCLUSION CONSTRAINT Postgres. `EReportingBatch`
--   référence une période (`periodId`). Le cap-split EINV-EREPORT-005 (une période
--   > MAX_BATCH_TRANSACTIONS crée plusieurs batches) reste valide : les splits
--   partagent UNE ligne période → aucun conflit d'exclusion.
--
-- ⚠️ PORTÉE : cet EXCLUDE garantit le NON-RECOUVREMENT, PAS l'absence de TROU.
--   Sauter une période contiguë ([J1,J2) puis [J3,J4) sans [J2,J3)) le satisfait.
--   L'anti-trou est assuré hors schéma : build-ereporting-batch crée la période de
--   toute période ayant des transactions, et check-ereporting-period-continuity
--   (Passe 5 de reconcile-invoices) alerte sur toute transaction close jamais
--   batchée. Une période sans vente est légitimement absente.
--
-- Choix techniques :
--   - tsrange (PAS tstzrange) : `periodFrom/To` sont des `timestamp(3)` SANS time
--     zone (Prisma DateTime sans annotation @db). tstzrange injecterait des
--     hypothèses de timezone de session sur une colonne tz-naïve.
--   - Bornes [periodFrom, periodTo) → tsrange(..., '[)'). Deux périodes contiguës
--     (periodTo de J = periodFrom de J+1, exclu à droite) ne se chevauchent PAS.
--   - btree_gist NON requis : `tsrange && tsrange` utilise le support gist natif
--     des types range (l'extension ne serait nécessaire que pour scoper la
--     contrainte par une colonne d'égalité, ex. `currency WITH =` — non retenu).
--   - Pas de prédicat partiel sur le statut : la non-recouvrement est portée par
--     la période (immuable, jamais recréée — les rejets REJECTED/ABANDONED se
--     rejouent in-place au niveau du batch), donc le cas « batch corrigé recréé
--     pour la même période » ne se produit pas.
-- ============================================================================

CREATE TABLE "EReportingPeriod" (
    "id" TEXT NOT NULL,
    "periodFrom" TIMESTAMP(3) NOT NULL,
    "periodTo" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EReportingPeriod_pkey" PRIMARY KEY ("id")
);

-- periodFrom @unique : handle idempotent pour l'upsert (périodes alignées +
-- non-recouvrantes => la borne basse identifie la période).
CREATE UNIQUE INDEX "EReportingPeriod_periodFrom_key" ON "EReportingPeriod"("periodFrom");

CREATE INDEX "EReportingPeriod_periodFrom_periodTo_idx" ON "EReportingPeriod"("periodFrom", "periodTo");

-- Cohérence des bornes : intervalle non vide.
ALTER TABLE "EReportingPeriod"
    ADD CONSTRAINT "EReportingPeriod_period_order"
    CHECK ("periodFrom" < "periodTo");

-- Non-recouvrement : aucune période ne peut chevaucher une autre. tsrange '[)'
-- => deux périodes contiguës (fin de J = début de J+1) ne se chevauchent PAS
-- (borne haute exclusive). NB : l'EXCLUDE n'empêche PAS un trou — cf. bloc ⚠️ ci-dessus.
ALTER TABLE "EReportingPeriod"
    ADD CONSTRAINT "EReportingPeriod_no_overlap"
    EXCLUDE USING gist (tsrange("periodFrom", "periodTo", '[)') WITH &&);

-- Rattachement batch -> période. Nullable (compat batches pré-migration), SetNull
-- pour conserver le batch si la période est purgée.
ALTER TABLE "EReportingBatch" ADD COLUMN "periodId" TEXT;

CREATE INDEX "EReportingBatch_periodId_idx" ON "EReportingBatch"("periodId");

ALTER TABLE "EReportingBatch"
    ADD CONSTRAINT "EReportingBatch_periodId_fkey"
    FOREIGN KEY ("periodId")
    REFERENCES "EReportingPeriod"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
