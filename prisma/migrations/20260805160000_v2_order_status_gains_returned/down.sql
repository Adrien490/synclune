-- Rollback de la 1ʳᵉ migration du Lot 4 (audit schéma V2, 2026-08-05).
--
-- ⚠️ Postgres ne sait PAS retirer une valeur d'un enum (`ALTER TYPE ... DROP VALUE`
-- n'existe pas). Le retrait passe donc par la recréation du type, ce qui exige que
-- plus AUCUNE ligne ne porte la valeur — d'où l'ordre : appliquer d'abord le
-- `down.sql` de `20260805170000`, qui recrée `fulfillmentStatus` et ramène les
-- commandes retournées sur `status = 'DELIVERED'`.
--
-- Le garde ci-dessous refuse d'aller plus loin si des lignes subsistent : mieux
-- vaut un rollback qui s'arrête net qu'un `USING` silencieux qui les écraserait.

DO $$
DECLARE
  remaining bigint;
BEGIN
  SELECT count(*) INTO remaining FROM "Order" WHERE status = 'RETURNED';
  IF remaining > 0 THEN
    RAISE EXCEPTION
      'Rollback impossible : % commande(s) portent encore status=RETURNED. Appliquer d''abord le down.sql de 20260805170000.',
      remaining;
  END IF;
END $$;

ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";

CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED');

ALTER TABLE "Order"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "OrderStatus" USING ("status"::text::"OrderStatus"),
  ALTER COLUMN "status" SET DEFAULT 'PENDING';

ALTER TABLE "OrderHistory"
  ALTER COLUMN "previousStatus" TYPE "OrderStatus" USING ("previousStatus"::text::"OrderStatus"),
  ALTER COLUMN "newStatus" TYPE "OrderStatus" USING ("newStatus"::text::"OrderStatus");

DROP TYPE "OrderStatus_old";
