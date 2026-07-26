-- Remove deletedAt from Wishlist and WishlistItem
-- Hard deletes are used for wishlists (no legal retention requirement)

-- Drop indexes first
DROP INDEX IF EXISTS "Wishlist_deletedAt_idx";
DROP INDEX IF EXISTS "WishlistItem_deletedAt_idx";

-- Remove columns
ALTER TABLE "Wishlist" DROP COLUMN IF EXISTS "deletedAt";
ALTER TABLE "WishlistItem" DROP COLUMN IF EXISTS "deletedAt";
