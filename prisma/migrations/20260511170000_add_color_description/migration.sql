-- AlterTable
ALTER TABLE "Color" ADD COLUMN "description" TEXT;

-- CreateIndex
CREATE INDEX "Color_isActive_idx" ON "Color"("isActive");
