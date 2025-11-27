-- DropIndex
DROP INDEX IF EXISTS "user_deletedAt_firstName_lastName_id_idx";

-- DropIndex
DROP INDEX IF EXISTS "user_firstName_lastName_id_idx";

-- AlterTable
ALTER TABLE "user" DROP COLUMN "firstName",
DROP COLUMN "lastName";
