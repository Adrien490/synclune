-- Rollback for 20260208_add_check_constraints
-- Removes CHECK constraints on ProductReview, CartItem, RefundItem, Discount.
-- Prisma does not run down migrations automatically — apply manually via psql:
--   psql $DATABASE_URL -f down.sql

ALTER TABLE "ProductReview" DROP CONSTRAINT IF EXISTS "ProductReview_rating_range";
ALTER TABLE "CartItem" DROP CONSTRAINT IF EXISTS "CartItem_quantity_positive";
ALTER TABLE "RefundItem" DROP CONSTRAINT IF EXISTS "RefundItem_quantity_positive";
ALTER TABLE "Discount" DROP CONSTRAINT IF EXISTS "Discount_value_positive";
