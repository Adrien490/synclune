-- Rollback : recrée les tables Wishlist/WishlistItem dans leur état
-- immédiatement antérieur à la migration (post 20260801000000_drop_wishlist_back_in_stock :
-- sans colonne backInStockNotifiedAt, avec Wishlist_updatedAt_idx et
-- WishlistItem_productId_idx). Les données, elles, ne sont pas restaurables
-- (Neon PITR si nécessaire).

-- CreateTable
CREATE TABLE "Wishlist" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wishlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WishlistItem" (
    "id" TEXT NOT NULL,
    "wishlistId" TEXT NOT NULL,
    "productId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WishlistItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Wishlist_userId_key" ON "Wishlist"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Wishlist_sessionId_key" ON "Wishlist"("sessionId");

-- CreateIndex
CREATE INDEX "Wishlist_updatedAt_idx" ON "Wishlist"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "WishlistItem_wishlistId_productId_key" ON "WishlistItem"("wishlistId", "productId");

-- CreateIndex
CREATE INDEX "WishlistItem_productId_idx" ON "WishlistItem"("productId");

-- AddForeignKey
ALTER TABLE "Wishlist" ADD CONSTRAINT "Wishlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_wishlistId_fkey" FOREIGN KEY ("wishlistId") REFERENCES "Wishlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Garde brut (était dans prisma/sql/raw-guards.sql avant le retrait)
ALTER TABLE "Wishlist" DROP CONSTRAINT IF EXISTS "Wishlist_owner_required";
ALTER TABLE "Wishlist" ADD CONSTRAINT "Wishlist_owner_required" CHECK ("userId" IS NOT NULL OR "sessionId" IS NOT NULL);
