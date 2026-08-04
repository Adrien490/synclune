-- Rollback de la 2ᵉ migration du Lot 4 (audit schéma V2, 2026-08-05).
--
-- Reconstruit l'axe `fulfillmentStatus` ET le repeuple depuis `status`, ce qui est
-- possible SANS perte grâce au lockstep : la correspondance était 1:1 dans le sens
-- status → fulfillment (c'est l'inverse — RETURNED — qui portait l'information
-- propre, et il est restauré explicitement plus bas).
--
-- ⚠️ À appliquer AVANT le `down.sql` de `20260805160000`, qui refusera de retirer
-- la valeur `RETURNED` de l'enum tant que des lignes la portent.

-- ---------------------------------------------------------------------------
-- 1. Type + colonnes
-- ---------------------------------------------------------------------------
CREATE TYPE "FulfillmentStatus" AS ENUM ('UNFULFILLED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'RETURNED');

ALTER TABLE "Order" ADD COLUMN "fulfillmentStatus" "FulfillmentStatus" NOT NULL DEFAULT 'UNFULFILLED';
ALTER TABLE "OrderHistory" ADD COLUMN "previousFulfillmentStatus" "FulfillmentStatus";
ALTER TABLE "OrderHistory" ADD COLUMN "newFulfillmentStatus" "FulfillmentStatus";

-- ---------------------------------------------------------------------------
-- 2. Repeuplement depuis `status`
-- ---------------------------------------------------------------------------
UPDATE "Order" SET "fulfillmentStatus" = CASE "status"
  WHEN 'PENDING'   THEN 'UNFULFILLED'::"FulfillmentStatus"
  WHEN 'PROCESSING' THEN 'PROCESSING'::"FulfillmentStatus"
  WHEN 'SHIPPED'   THEN 'SHIPPED'::"FulfillmentStatus"
  WHEN 'DELIVERED' THEN 'DELIVERED'::"FulfillmentStatus"
  WHEN 'RETURNED'  THEN 'RETURNED'::"FulfillmentStatus"
  -- `CANCELLED` n'avait pas d'équivalent : `FulfillmentStatus` n'en portait pas de
  -- membre, et `cancel-order.ts` ne touchait jamais cette colonne. La valeur
  -- d'origine sur une commande annulée était donc celle d'avant l'annulation, que
  -- rien ne permet de reconstituer — `UNFULFILLED` (le défaut) est le choix sûr :
  -- il ne fait entrer aucune commande annulée dans la file « à expédier », puisque
  -- l'ancienne clause portait AUSSI un `status != CANCELLED`.
  ELSE 'UNFULFILLED'::"FulfillmentStatus"
END;

-- Le retour redevient une divergence entre les deux axes : `markAsReturned`
-- laissait `status = DELIVERED`.
UPDATE "Order" SET "status" = 'DELIVERED' WHERE "status" = 'RETURNED';

-- ---------------------------------------------------------------------------
-- 3. Audit trail
-- ---------------------------------------------------------------------------
-- Les transitions de retour redeviennent des transitions de fulfillment.
UPDATE "OrderHistory"
SET "previousFulfillmentStatus" = 'DELIVERED'::"FulfillmentStatus",
    "newFulfillmentStatus" = 'RETURNED'::"FulfillmentStatus",
    "previousStatus" = NULL,
    "newStatus" = NULL
WHERE "newStatus" = 'RETURNED';

UPDATE "OrderHistory" SET "previousStatus" = 'DELIVERED' WHERE "previousStatus" = 'RETURNED';
