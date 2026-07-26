-- AlterTable
-- Retrait du dialogue de bienvenue admin (one-shot onboarding personnel).
ALTER TABLE "User" DROP COLUMN "welcomeShownAt";
