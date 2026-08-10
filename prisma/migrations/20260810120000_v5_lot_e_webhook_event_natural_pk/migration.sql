-- Audit schéma V5, Lot E (docs/SIMPLIFICATION-V2.md § 4) — `WebhookEvent`
-- RÉDUITE, jamais supprimée : la table reste le support de l'idempotence hors
-- fulfillment (remboursement, litige), du compteur `attempts` (seuil d'alerte
-- admin) et de la surface d'incident SQL.
--
-- Deux colonnes partent :
--   - `id` : clé surrogate jamais sélectionnée pour elle-même — tous les accès
--     passaient par `stripeEventId` (unique par construction chez Stripe), qui
--     devient la PK naturelle ;
--   - `processedAt` : write-only, et ce retrait INFIRME explicitement la
--     décision V4 qui l'avait conservée — « traité quand » reste lisible via
--     `processingStartedAt` à la précision d'incident près.

ALTER TABLE "WebhookEvent" DROP CONSTRAINT "WebhookEvent_pkey";
ALTER TABLE "WebhookEvent" DROP COLUMN "id";
ALTER TABLE "WebhookEvent" DROP COLUMN "processedAt";

-- L'unique devient la PK (l'index unique dédié est alors redondant).
DROP INDEX "WebhookEvent_stripeEventId_key";
ALTER TABLE "WebhookEvent" ADD CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("stripeEventId");
