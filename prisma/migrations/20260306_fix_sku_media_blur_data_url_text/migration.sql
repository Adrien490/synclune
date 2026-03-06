-- AlterTable: change SkuMedia.blurDataUrl from VarChar(255) to Text
-- for consistency with ReviewMedia and CustomizationMedia
ALTER TABLE "SkuMedia" ALTER COLUMN "blurDataUrl" TYPE TEXT;
