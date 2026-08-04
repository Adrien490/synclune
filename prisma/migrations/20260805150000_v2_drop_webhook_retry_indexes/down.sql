-- Rollback du Lot 3 de l'audit schéma V2 (2026-08-05).
--
-- Purement structurel : un index se recrée sans perte. Noms et colonnes repris
-- à l'identique de `0_init` (lignes 1074 et 1080), pour que la base revienne
-- exactement à l'état que le baseline construit.
--
-- ⚠️ Recréer les index NE RESTAURE PAS la tâche `retry-webhooks` : son service
-- (`modules/cron/services/retry-webhooks.service.ts`) et son entrée dans
-- `MAINTENANCE_TASK_IDS` sont partis du code au même lot. Un rollback DB seul
-- laisserait donc deux index sans lecteur — ce qui est inoffensif, mais ne
-- rétablit pas la fonction. Pour cela : `git revert` du commit applicatif.

CREATE INDEX "WebhookEvent_status_processedAt_idx" ON "WebhookEvent"("status", "processedAt");
CREATE INDEX "WebhookEvent_status_attempts_processedAt_idx" ON "WebhookEvent"("status", "attempts", "processedAt");
