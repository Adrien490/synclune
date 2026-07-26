-- Migrate OrderHistory.source from String to HistorySource enum
-- Migrate Order.taxBehavior from String to TaxBehavior enum

-- Create HistorySource enum
CREATE TYPE "HistorySource" AS ENUM ('ADMIN', 'WEBHOOK', 'SYSTEM', 'CUSTOMER');

-- Create TaxBehavior enum
CREATE TYPE "TaxBehavior" AS ENUM ('INCLUSIVE', 'EXCLUSIVE');

-- Migrate OrderHistory.source: String -> HistorySource enum
ALTER TABLE "OrderHistory"
  ALTER COLUMN "source" DROP DEFAULT;
ALTER TABLE "OrderHistory"
  ALTER COLUMN "source" TYPE "HistorySource"
  USING UPPER("source")::"HistorySource";
ALTER TABLE "OrderHistory"
  ALTER COLUMN "source" SET DEFAULT 'ADMIN';

-- Migrate Order.taxBehavior: String -> TaxBehavior enum
ALTER TABLE "Order"
  ALTER COLUMN "taxBehavior" DROP DEFAULT;
ALTER TABLE "Order"
  ALTER COLUMN "taxBehavior" TYPE "TaxBehavior"
  USING UPPER("taxBehavior")::"TaxBehavior";
ALTER TABLE "Order"
  ALTER COLUMN "taxBehavior" SET DEFAULT 'INCLUSIVE';
