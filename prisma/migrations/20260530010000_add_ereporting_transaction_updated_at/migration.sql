-- Add updatedAt to EReportingTransaction (observability du cycle de transmission DGFiP).
-- Le status mute (PENDING -> SENT -> ACCEPTED/REJECTED), batchId est posé/détaché et
-- requeueCount s'incrémente, mais seul createdAt existait : impossible de dater le dernier
-- changement au niveau ligne. Le payload reste figé (payloadSnapshot/payloadHash) — updatedAt
-- n'horodate QUE le tracking de transmission, pas la donnée comptable.
--
-- Additif non-breaking : DEFAULT CURRENT_TIMESTAMP backfille les lignes existantes ;
-- ensuite Prisma (@updatedAt) gère la valeur applicativement à chaque update.
ALTER TABLE "EReportingTransaction"
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
