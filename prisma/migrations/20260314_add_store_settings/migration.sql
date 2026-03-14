-- CreateTable
CREATE TABLE "StoreSettings" (
    "id" TEXT NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "closureMessage" VARCHAR(500),
    "closedAt" TIMESTAMP(3),
    "reopensAt" TIMESTAMP(3),
    "closedBy" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreSettings_pkey" PRIMARY KEY ("id")
);

-- Seed singleton row
INSERT INTO "StoreSettings" ("id", "isClosed", "createdAt", "updatedAt")
VALUES ('store-settings-singleton', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
