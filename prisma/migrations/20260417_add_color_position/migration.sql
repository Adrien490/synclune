-- Add custom chromatic order to Color table (admin drag-and-drop)
-- Default 0 for existing rows; admin can reorder via reorderColors action.

ALTER TABLE "Color" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;

-- Backfill positions based on current alphabetical order so existing rows
-- get a deterministic initial ordering instead of all sharing position = 0.
WITH ordered AS (
  SELECT id, (ROW_NUMBER() OVER (ORDER BY name ASC) - 1)::int AS new_position
  FROM "Color"
)
UPDATE "Color"
SET "position" = ordered.new_position
FROM ordered
WHERE "Color".id = ordered.id;

CREATE INDEX "Color_position_idx" ON "Color" ("position");
