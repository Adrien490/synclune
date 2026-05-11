-- DropColumn
-- Champ jamais lu (cron auto-reactivation jamais implémenté). Cf. audit P1.7.
ALTER TABLE "Discount" DROP COLUMN "manuallyDeactivated";
