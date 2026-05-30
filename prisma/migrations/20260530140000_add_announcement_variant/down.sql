-- Rollback: drop announcement variant column + enum type
ALTER TABLE "StoreSettings" DROP COLUMN "announcementVariant";

DROP TYPE "AnnouncementVariant";
