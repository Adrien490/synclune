-- Rollback : User B2B fields
DROP INDEX IF EXISTS "User_customerType_deletedAt_idx";
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_companyVatNumber_format_check";
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_companySiret_format_check";
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_companySiren_format_check";
ALTER TABLE "User"
    DROP COLUMN IF EXISTS "companyVatNumber",
    DROP COLUMN IF EXISTS "companySiret",
    DROP COLUMN IF EXISTS "companySiren",
    DROP COLUMN IF EXISTS "companyName",
    DROP COLUMN IF EXISTS "customerType";
DROP TYPE IF EXISTS "CustomerType";
