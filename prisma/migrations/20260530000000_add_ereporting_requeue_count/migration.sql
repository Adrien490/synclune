-- EINV-EREPORT-009 : cap anti-boucle de re-rejet pour les transactions e-reporting.
-- Chaque re-queue (détache + PENDING) après un batch REJECTED/ABANDONED incrémente
-- ce compteur. Au-delà de MAX_REQUEUE_ATTEMPTS (code), la transaction est figée
-- ABANDONED sur son tombstone batch au lieu d'être ré-agrégée → force une
-- intervention admin plutôt qu'une boucle quotidienne de re-rejet au go-live PA.
ALTER TABLE "EReportingTransaction"
    ADD COLUMN "requeueCount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "EReportingTransaction" ADD CONSTRAINT "EReportingTransaction_requeueCount_non_negative"
    CHECK ("requeueCount" >= 0);
