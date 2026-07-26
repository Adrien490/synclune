-- Add announcement fields to StoreSettings singleton (replaces AnnouncementBar)
-- AnnouncementBar table is kept in place (DROP deferred to separate migration, +48h)
ALTER TABLE "StoreSettings"
ADD COLUMN "announcementMessage" VARCHAR(200),
ADD COLUMN "announcementLink" VARCHAR(2048),
ADD COLUMN "announcementStartsAt" TIMESTAMP(3),
ADD COLUMN "announcementEndsAt" TIMESTAMP(3),
ADD COLUMN "announcementIsActive" BOOLEAN NOT NULL DEFAULT false;
