-- AlterTable: Convert enum columns to varchar
ALTER TABLE "Order" ALTER COLUMN "paymentMethod" SET DATA TYPE VARCHAR(20);
ALTER TABLE "Order" ALTER COLUMN "paymentMethod" SET DEFAULT 'CARD';

ALTER TABLE "Order" ALTER COLUMN "shippingMethod" SET DATA TYPE VARCHAR(20);

ALTER TABLE "Order" ALTER COLUMN "currency" SET DATA TYPE VARCHAR(3);
ALTER TABLE "Order" ALTER COLUMN "currency" SET DEFAULT 'EUR';

ALTER TABLE "Refund" ALTER COLUMN "currency" SET DATA TYPE VARCHAR(3);
ALTER TABLE "Refund" ALTER COLUMN "currency" SET DEFAULT 'EUR';

-- DropEnum
DROP TYPE "PaymentMethod";
DROP TYPE "ShippingMethod";
DROP TYPE "CurrencyCode";
