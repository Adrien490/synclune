-- CreateTable
CREATE TABLE "AnnouncementBar" (
    "id" TEXT NOT NULL,
    "message" VARCHAR(200) NOT NULL,
    "link" VARCHAR(2048),
    "linkText" VARCHAR(50),
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "dismissDurationHours" INTEGER NOT NULL DEFAULT 24,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnnouncementBar_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnnouncementBar_isActive_startsAt_endsAt_idx" ON "AnnouncementBar"("isActive", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "AnnouncementBar_createdAt_idx" ON "AnnouncementBar"("createdAt" DESC);
