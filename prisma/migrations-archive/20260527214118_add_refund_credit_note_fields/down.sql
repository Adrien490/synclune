-- Rollback : Refund credit note fields
ALTER TABLE "Refund" DROP CONSTRAINT IF EXISTS "Refund_creditNoteNumber_format_check";
DROP INDEX IF EXISTS "Refund_creditNoteNumber_key";
ALTER TABLE "Refund"
    DROP COLUMN IF EXISTS "creditNotePdfHash",
    DROP COLUMN IF EXISTS "creditNotePdfUrl",
    DROP COLUMN IF EXISTS "creditNoteGeneratedAt",
    DROP COLUMN IF EXISTS "creditNoteNumber";
