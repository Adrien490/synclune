-- AlterTable
-- Snapshot CSV des hex codes (ordre = position) pour rendu pastille email/facture.
-- Nullable + retro-compatible : les anciens OrderItem restent valides (pas de pastille).
ALTER TABLE "OrderItem" ADD COLUMN "skuColorHexes" VARCHAR(200);
