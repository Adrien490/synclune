-- Simplify V1: Remove stock notifications, simplify OrderAction enum
-- - Drop StockNotificationRequest table and StockNotificationStatus enum
-- - Remove 4 unused OrderAction values: NOTE_ADDED, NOTE_DELETED, TRACKING_UPDATED, MANUAL_EDIT

-- DropForeignKey
ALTER TABLE "StockNotificationRequest" DROP CONSTRAINT "StockNotificationRequest_skuId_fkey";
ALTER TABLE "StockNotificationRequest" DROP CONSTRAINT "StockNotificationRequest_userId_fkey";

-- DropTable
DROP TABLE "StockNotificationRequest";

-- DropEnum
DROP TYPE "StockNotificationStatus";

-- AlterEnum: Remove 4 unused values from OrderAction
BEGIN;
CREATE TYPE "OrderAction_new" AS ENUM ('CREATED', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED', 'STATUS_REVERTED');
ALTER TABLE "OrderHistory" ALTER COLUMN "action" TYPE "OrderAction_new" USING ("action"::text::"OrderAction_new");
ALTER TYPE "OrderAction" RENAME TO "OrderAction_old";
ALTER TYPE "OrderAction_new" RENAME TO "OrderAction";
DROP TYPE "OrderAction_old";
COMMIT;
