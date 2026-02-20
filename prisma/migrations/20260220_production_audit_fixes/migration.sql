-- B2: Drop phantom WishlistItem.deletedAt column
-- Added by 20260212_schema_audit_v2 (M4) but never declared in schema.prisma
-- Wishlists use hard deletes (no legal retention requirement)
ALTER TABLE "WishlistItem" DROP COLUMN IF EXISTS "deletedAt";

-- C3: Add indexes for Account token expiration fields
-- Used by cleanup-sessions cron for expired OAuth token cleanup
CREATE INDEX "Account_accessTokenExpiresAt_idx" ON "Account"("accessTokenExpiresAt");
CREATE INDEX "Account_refreshTokenExpiresAt_idx" ON "Account"("refreshTokenExpiresAt");
