-- CreateIndex
CREATE INDEX "SkuMedia_skuId_isPrimary_idx" ON "SkuMedia"("skuId", "isPrimary");

-- AlterColumn: blurDataUrl from TEXT to VARCHAR(255)
-- ThumbHash base64 produces ~35-50 chars, TEXT uses TOAST storage unnecessarily
ALTER TABLE "SkuMedia" ALTER COLUMN "blurDataUrl" TYPE VARCHAR(255);
