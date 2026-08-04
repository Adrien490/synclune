-- Rollback du Lot 5 (audit schéma V4) : recrée les 9 index, avec les définitions
-- exactes de `0_init` (lignes 828, 837, 846, 852, 861, 873, 891, 906, 1020).
--
-- Un index se recrée intégralement depuis les données : ce rollback est total, il
-- ne perd rien.

CREATE INDEX "ProductType_isActive_idx" ON "ProductType"("isActive");
CREATE INDEX "Color_isActive_idx" ON "Color"("isActive");
CREATE INDEX "Material_isActive_idx" ON "Material"("isActive");
CREATE INDEX "Collection_status_idx" ON "Collection"("status");
CREATE INDEX "Product_status_deletedAt_idx" ON "Product"("status", "deletedAt");
CREATE INDEX "ProductSkuColor_skuId_position_idx" ON "ProductSkuColor"("skuId", "position");
CREATE INDEX "ProductSkuMaterial_skuId_position_idx" ON "ProductSkuMaterial"("skuId", "position");
CREATE INDEX "SkuMedia_skuId_isPrimary_idx" ON "SkuMedia"("skuId", "isPrimary");
CREATE INDEX "Refund_createdAt_idx" ON "Refund"("createdAt" DESC);
