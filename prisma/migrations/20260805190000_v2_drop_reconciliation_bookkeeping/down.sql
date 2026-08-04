-- Rollback du dégraissage de la couche de rattrapage (2026-08-05).
--
-- Structurellement complet, et sans perte fonctionnelle réelle : les quatre
-- colonnes étaient des COMPTEURS et des CURSEURS, pas des données métier.
--
-- Elles reviennent à leur valeur par défaut, ce qui est exactement le bon état de
-- reprise :
--   * `pdfIntegrityCheckedAt` NULL = « jamais audité », donc prioritaire dans
--     l'`orderBy ... nulls: "first"` de la passe — elle re-balaierait tout le
--     corpus, ce qu'on veut après une interruption ;
--   * `overbillingResolvedAt` NULL = « non résolu », donc re-listé au dashboard :
--     conservateur, jamais résolu à tort ;
--   * `invoiceReconcileAttempts` 0 = compteur remis à zéro, l'escalade repart de
--     trois échecs.
--
-- ⚠️ Recréer les colonnes NE RÉTABLIT AUCUNE des trois mécaniques : le service
-- `verify-pdf-archive-integrity.service.ts`, la passe `reconcileOverbilledOrders`,
-- la fonction `escalate()` et le compteur du dashboard sont partis du CODE au même
-- lot. Un rollback DB seul laisserait quatre colonnes sans écrivain — inoffensif,
-- mais inutile. Pour les rétablir : `git revert` du commit applicatif.

-- 3. Compteur d'escalade de la DLQ facture (+ son CHECK, cf. raw-guards.sql)
ALTER TABLE "Order" ADD COLUMN "invoiceReconcileAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD CONSTRAINT "Order_invoiceReconcileAttempts_check" CHECK ("invoiceReconcileAttempts" >= 0);

-- 2. Résolution de sur-facturation
ALTER TABLE "Order" ADD COLUMN "overbillingResolvedAt" TIMESTAMP(3);

-- 1. Curseurs de la passe d'intégrité PDF
ALTER TABLE "Refund" ADD COLUMN "pdfIntegrityCheckedAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "pdfIntegrityCheckedAt" TIMESTAMP(3);
