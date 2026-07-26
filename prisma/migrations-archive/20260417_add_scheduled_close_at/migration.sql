-- Add scheduledCloseAt to StoreSettings for planned future closures
ALTER TABLE "StoreSettings"
ADD COLUMN "scheduledCloseAt" TIMESTAMP(3);
