-- Optimize indexes: remove redundant Order.deletedAt index, add User.name index

-- Remove redundant index on Order.deletedAt (covered by composite [deletedAt, status, createdAt])
DROP INDEX IF EXISTS "Order_deletedAt_idx";

-- Add index for admin user sorting by name
CREATE INDEX "User_name_id_idx" ON "User"("name", "id");
