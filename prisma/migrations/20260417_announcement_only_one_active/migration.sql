-- AnnouncementBar: enforce "1 seule annonce active" au niveau DB
-- Avant: regle metier appliquee uniquement par transaction applicative (toggle-announcement-status.ts).
-- Apres: contrainte DB partielle (defense-in-depth, race-free).

-- Cleanup defensif: si plusieurs actives existent, garder la plus recemment mise a jour
WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (ORDER BY "updatedAt" DESC, "createdAt" DESC) as rn
  FROM "AnnouncementBar"
  WHERE "isActive" = true
)
UPDATE "AnnouncementBar"
SET "isActive" = false
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

CREATE UNIQUE INDEX "AnnouncementBar_only_one_active_unique"
  ON "AnnouncementBar" ("isActive")
  WHERE "isActive" = true;
