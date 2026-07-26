-- WEBHOOK-AUDIT-003 : ajoute lastAttemptAt à PostWebhookTask.
-- Horodate la DERNIÈRE tentative d'exécution (posé par le claim optimiste de
-- executeBatch, en même temps que l'incrément d'attempts).
--
-- Sans cette colonne, retry-post-webhook-tasks ne pouvait sélectionner que sur
-- `status + attempts`, donc sans aucun backoff : à cadence fixe de 5 min, les 5
-- tentatives d'une task étaient consommées en ~20 min. Toute indisponibilité Resend
-- plus longue mettait la confirmation de commande en dead-letter définitif. Avec
-- lastAttemptAt, la sélection applique des paliers croissants par nombre de
-- tentatives, portant le budget de retry à ~3 h.
--
-- Additif non-breaking : colonne nullable, backfill NULL pour les lignes existantes.
-- Le code traite NULL comme « jamais tentée » donc immédiatement éligible (fail-open,
-- même parti pris que `processingStartedAt ?? receivedAt`).
ALTER TABLE "PostWebhookTask"
  ADD COLUMN "lastAttemptAt" TIMESTAMP(3);

-- Sert la sélection par paliers du cron (status + attempts + lastAttemptAt).
CREATE INDEX "PostWebhookTask_status_attempts_lastAttemptAt_idx"
  ON "PostWebhookTask"("status", "attempts", "lastAttemptAt");
