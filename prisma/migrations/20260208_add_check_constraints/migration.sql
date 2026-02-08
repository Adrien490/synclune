-- Add CHECK constraints for business rules that are currently only validated by Zod
-- These constraints provide a database-level safety net against invalid data

-- Validate no existing data violates the new constraints
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "ProductReview" WHERE "rating" < 1 OR "rating" > 5 LIMIT 1) THEN
    RAISE EXCEPTION 'ProductReview contains invalid ratings';
  END IF;
  IF EXISTS (SELECT 1 FROM "CartItem" WHERE "quantity" < 1 LIMIT 1) THEN
    RAISE EXCEPTION 'CartItem contains invalid quantities';
  END IF;
  IF EXISTS (SELECT 1 FROM "RefundItem" WHERE "quantity" < 1 LIMIT 1) THEN
    RAISE EXCEPTION 'RefundItem contains invalid quantities';
  END IF;
  IF EXISTS (SELECT 1 FROM "Discount" WHERE "value" <= 0 LIMIT 1) THEN
    RAISE EXCEPTION 'Discount contains invalid values';
  END IF;
END $$;

-- ProductReview.rating must be between 1 and 5
ALTER TABLE "ProductReview"
  ADD CONSTRAINT "ProductReview_rating_range"
  CHECK ("rating" >= 1 AND "rating" <= 5);

-- CartItem.quantity must be at least 1
ALTER TABLE "CartItem"
  ADD CONSTRAINT "CartItem_quantity_positive"
  CHECK ("quantity" >= 1);

-- RefundItem.quantity must be at least 1
ALTER TABLE "RefundItem"
  ADD CONSTRAINT "RefundItem_quantity_positive"
  CHECK ("quantity" >= 1);

-- Discount.value must be positive
ALTER TABLE "Discount"
  ADD CONSTRAINT "Discount_value_positive"
  CHECK ("value" > 0);
