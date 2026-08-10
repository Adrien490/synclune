-- Rollback V5 Lot E — restaure la clé surrogate et `processedAt`.
--
-- Best-effort sur les DONNÉES : les `id` d'origine (cuid) et les valeurs de
-- `processedAt` sont perdus ; les ids régénérés sont des UUID (la colonne est
-- TEXT, seul le générateur applicatif produit des cuid) et `processedAt`
-- revient NULL.

ALTER TABLE "WebhookEvent" DROP CONSTRAINT "WebhookEvent_pkey";

ALTER TABLE "WebhookEvent" ADD COLUMN "id" TEXT;
UPDATE "WebhookEvent" SET "id" = gen_random_uuid()::text;
ALTER TABLE "WebhookEvent" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "WebhookEvent" ADD CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id");

CREATE UNIQUE INDEX "WebhookEvent_stripeEventId_key" ON "WebhookEvent"("stripeEventId");

ALTER TABLE "WebhookEvent" ADD COLUMN "processedAt" TIMESTAMP(3);
