-- Lot 2 (docs/SIMPLIFICATION.md S3.4, arbitré 2026-08-03) — retrait de la file
-- durable PostWebhookTask. Les tâches post-webhook (emails, invalidation cache)
-- s'exécutent désormais en direct (`execute-post-webhook-tasks.service.ts`) ;
-- la dédup email reste portée par les clés d'idempotence Resend (24 h) et le
-- claim `Refund.confirmationEmailSentAt`. Les lignes existantes sont des
-- artefacts d'exécution (aucune valeur comptable ni RGPD) — la table part avec
-- son contenu, son CHECK (`PostWebhookTask_attempts_non_negative`, retiré de la
-- SSOT raw-guards.sql dans le même lot) et ses index.

DROP TABLE IF EXISTS "PostWebhookTask";
DROP TYPE IF EXISTS "PostWebhookTaskStatus";
