-- Phase 1 Audit Refactoring 2026 — DROP legacy modules + AuditLog + FailedEmail
-- Note: wishlist kept per user request. AnnouncementBar replaced by fields already present in StoreSettings.
-- AuditLog removed (solo-artisan scale). FailedEmail removed (Resend handles retries).

-- 1. Drop foreign keys referencing CustomizationRequest / CustomizationMedia
ALTER TABLE IF EXISTS "CustomizationMedia" DROP CONSTRAINT IF EXISTS "CustomizationMedia_customizationRequestId_fkey";
ALTER TABLE IF EXISTS "CustomizationRequest" DROP CONSTRAINT IF EXISTS "CustomizationRequest_userId_fkey";
ALTER TABLE IF EXISTS "CustomizationRequest" DROP CONSTRAINT IF EXISTS "CustomizationRequest_productTypeId_fkey";

-- 2. Drop M2M join table CustomizationInspirations (Product <-> CustomizationRequest)
DROP TABLE IF EXISTS "_CustomizationInspirations" CASCADE;

-- 3. Drop customization tables + enum
DROP TABLE IF EXISTS "CustomizationMedia" CASCADE;
DROP TABLE IF EXISTS "CustomizationRequest" CASCADE;
DROP TYPE IF EXISTS "CustomizationRequestStatus";

-- 4. Drop FaqItem
DROP TABLE IF EXISTS "FaqItem" CASCADE;

-- 5. Drop AnnouncementBar (replaced by StoreSettings.announcement* columns)
DROP TABLE IF EXISTS "AnnouncementBar" CASCADE;

-- 6. Drop AuditLog (OWASP A09 audit trail removed for solo-artisan scale)
DROP TABLE IF EXISTS "AuditLog" CASCADE;

-- 7. Drop FailedEmail (dead-letter queue removed — Resend handles retries)
DROP TABLE IF EXISTS "FailedEmail" CASCADE;
