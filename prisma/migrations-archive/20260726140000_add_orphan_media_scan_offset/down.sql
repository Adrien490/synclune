-- Rollback : le cron `cleanup-orphan-media` repart alors de l'offset 0 à chaque
-- run (comportement antérieur, cf. audit média M2).
ALTER TABLE "StoreSettings"
  DROP COLUMN "orphanMediaScanOffset";
