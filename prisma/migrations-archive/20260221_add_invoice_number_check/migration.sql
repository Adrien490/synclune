-- Add CHECK constraint on Order.invoiceNumber to enforce F-YYYY-NNNNN format at DB level
-- Complements existing app-level validation (Art. 286 CGI compliance)
-- NULL values are allowed (invoice not yet generated)
ALTER TABLE "Order"
  ADD CONSTRAINT "Order_invoiceNumber_format"
  CHECK ("invoiceNumber" IS NULL OR "invoiceNumber" ~ '^F-[0-9]{4}-[0-9]{5}$');
