-- =====================================================================
-- Add indexes User(role, deletedAt) + User(deletedAt, suspendedAt)
-- =====================================================================
-- Audit modules/users 2026-05-11 P1.3 :
-- - Admin count guard ("≥ 1 ADMIN" before demote/delete) runs on every
--   change-role / bulk-change-role / delete-user. Without an index on
--   (role, deletedAt) it triggers a sequential scan.
-- - The admin users listing filters on deletedAt / suspendedAt with
--   role filter; covering index speeds it up.
-- =====================================================================

CREATE INDEX IF NOT EXISTS "User_role_deletedAt_idx"
  ON "User" ("role", "deletedAt");

CREATE INDEX IF NOT EXISTS "User_deletedAt_suspendedAt_idx"
  ON "User" ("deletedAt", "suspendedAt");
