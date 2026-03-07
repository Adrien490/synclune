-- CreateIndex
CREATE INDEX "ProductReview_productId_status_deletedAt_idx" ON "ProductReview"("productId", "status", "deletedAt");
