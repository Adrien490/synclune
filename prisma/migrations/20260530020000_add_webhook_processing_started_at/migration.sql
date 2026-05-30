-- WEBHOOK-AUDIT-002 : ajoute processingStartedAt à WebhookEvent.
-- Horodate le DÉBUT du traitement courant (posé à chaque passage en PROCESSING :
-- création/reprise par la route webhook, claim du cron retry-webhooks). Distinct de
-- receivedAt (1ère réception, jamais rafraîchie). Sert à mesurer la fraîcheur d'un
-- PROCESSING pour la détection « périmé » (lambda crashée) sans qu'un PROCESSING
-- fraîchement repris par le cron soit pris à tort pour périmé par une redélivrance
-- Stripe concurrente (qui sinon barge-in et double-dispatch l'event).
--
-- Additif non-breaking : colonne nullable, backfill NULL pour les lignes existantes.
-- Le code lit `processingStartedAt ?? receivedAt` (fallback legacy).
ALTER TABLE "WebhookEvent"
  ADD COLUMN "processingStartedAt" TIMESTAMP(3);
