-- CreateTable
CREATE TABLE "CustomizationMedia" (
    "id" TEXT NOT NULL,
    "customizationRequestId" TEXT NOT NULL,
    "url" VARCHAR(2048) NOT NULL,
    "blurDataUrl" TEXT,
    "altText" VARCHAR(255),
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomizationMedia_pkey" PRIMARY KEY ("id")
);

-- Migrate existing data: convert inspirationImageUrls array to CustomizationMedia rows
INSERT INTO "CustomizationMedia" ("id", "customizationRequestId", "url", "position", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    cr."id",
    img.url,
    img.ordinality::integer - 1,
    cr."createdAt",
    cr."updatedAt"
FROM "CustomizationRequest" cr,
LATERAL UNNEST(cr."inspirationImageUrls") WITH ORDINALITY AS img(url, ordinality)
WHERE array_length(cr."inspirationImageUrls", 1) > 0;

-- Drop the old column
ALTER TABLE "CustomizationRequest" DROP COLUMN "inspirationImageUrls";

-- CreateIndex
CREATE INDEX "CustomizationMedia_customizationRequestId_position_idx" ON "CustomizationMedia"("customizationRequestId", "position");

-- AddForeignKey
ALTER TABLE "CustomizationMedia" ADD CONSTRAINT "CustomizationMedia_customizationRequestId_fkey" FOREIGN KEY ("customizationRequestId") REFERENCES "CustomizationRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
