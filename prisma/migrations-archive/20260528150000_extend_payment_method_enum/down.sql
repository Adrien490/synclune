-- Rollback : revient à enum PaymentMethod = { CARD } uniquement.
--
-- Postgres ne supporte pas ALTER TYPE ... DROP VALUE. On reconstruit l'enum
-- via RENAME + CREATE + CAST + DROP. Avant rollback, NE RIEN avoir d'autre
-- que CARD dans les colonnes typées PaymentMethod (Order, EReportingTransaction)
-- sinon le CAST échoue. À forcer en amont :
--   UPDATE "Order" SET "paymentMethod" = 'CARD' WHERE "paymentMethod" != 'CARD';
--   UPDATE "EReportingTransaction" SET "paymentMethod" = 'CARD' WHERE "paymentMethod" != 'CARD';

ALTER TYPE "PaymentMethod" RENAME TO "PaymentMethod_extended";
CREATE TYPE "PaymentMethod" AS ENUM ('CARD');
ALTER TABLE "Order"
    ALTER COLUMN "paymentMethod" TYPE "PaymentMethod"
    USING "paymentMethod"::text::"PaymentMethod";
ALTER TABLE "EReportingTransaction"
    ALTER COLUMN "paymentMethod" TYPE "PaymentMethod"
    USING "paymentMethod"::text::"PaymentMethod";
DROP TYPE "PaymentMethod_extended";
