-- Rollback : recrée l'enum et les 6 colonnes dans leur état immédiatement
-- antérieur à la migration. Les VALEURS ne sont pas restaurables (le contenu du
-- bandeau est perdu) — Neon PITR si nécessaire.

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AnnouncementVariant') THEN
    CREATE TYPE "AnnouncementVariant" AS ENUM ('PROMO', 'INFO', 'WARNING');
  END IF;
END
$$;

-- AddColumn
ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "announcementMessage" VARCHAR(200);
ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "announcementLink" VARCHAR(2048);
ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "announcementStartsAt" TIMESTAMP(3);
ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "announcementEndsAt" TIMESTAMP(3);
ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "announcementIsActive" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "announcementVariant" "AnnouncementVariant" NOT NULL DEFAULT 'PROMO';
