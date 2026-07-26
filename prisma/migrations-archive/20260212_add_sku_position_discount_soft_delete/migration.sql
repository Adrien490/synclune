-- 1. SkuMedia: Add position field for explicit image ordering
ALTER TABLE "SkuMedia" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;

-- Populate position from current ordering (isPrimary DESC, createdAt ASC)
-- Primary images get position 0, others get 1, 2, 3... per SKU
UPDATE "SkuMedia"
SET "position" = sub.pos
FROM (
  SELECT "id",
         ROW_NUMBER() OVER (
           PARTITION BY "skuId"
           ORDER BY "isPrimary" DESC, "createdAt" ASC
         ) - 1 AS pos
  FROM "SkuMedia"
) AS sub
WHERE "SkuMedia"."id" = sub."id";

-- Replace old index with position-based one
DROP INDEX IF EXISTS "SkuMedia_skuId_isPrimary_idx";
CREATE INDEX "SkuMedia_skuId_position_idx" ON "SkuMedia"("skuId", "position");

-- 2. Discount: Add soft delete support
ALTER TABLE "Discount" ADD COLUMN "deletedAt" TIMESTAMP(3);
CREATE INDEX "Discount_deletedAt_isActive_idx" ON "Discount"("deletedAt", "isActive");

-- 3. CustomizationRequest: Add index for "My requests" page
CREATE INDEX "CustomizationRequest_userId_status_idx" ON "CustomizationRequest"("userId", "status");
