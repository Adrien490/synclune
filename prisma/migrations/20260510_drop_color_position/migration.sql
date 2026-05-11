-- Drop the custom chromatic order column on Color
-- The drag-and-drop reorder feature was never wired to the admin UI; the column
-- and its index are dead code (audit 2026-05-10).

DROP INDEX IF EXISTS "Color_position_idx";

ALTER TABLE "Color" DROP COLUMN IF EXISTS "position";
