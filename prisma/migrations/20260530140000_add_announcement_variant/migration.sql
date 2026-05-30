-- CreateEnum
CREATE TYPE "AnnouncementVariant" AS ENUM ('PROMO', 'INFO', 'WARNING');

-- AlterTable
ALTER TABLE "StoreSettings"
ADD COLUMN "announcementVariant" "AnnouncementVariant" NOT NULL DEFAULT 'PROMO';
