-- Rollback : retire la CHECK constraint sur Order.invoiceNumber
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_invoiceNumber_format";
