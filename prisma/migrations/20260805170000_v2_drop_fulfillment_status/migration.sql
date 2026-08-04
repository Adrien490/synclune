-- Lot 4 de l'audit schéma V2 (2026-08-05), SECONDE des deux migrations — retrait
-- de l'axe `fulfillmentStatus`.
--
-- POURQUOI. `Order.status` et `Order.fulfillmentStatus` étaient écrits EN LOCKSTEP
-- par les 7 actions de commande, avec une correspondance 1:1 :
--
--     UNFULFILLED ↔ PENDING     (posés ensemble à la création)
--     PROCESSING  ↔ PROCESSING
--     SHIPPED     ↔ SHIPPED
--     DELIVERED   ↔ DELIVERED
--     RETURNED    ↔ (rien)      ← la SEULE information propre
--
-- Le webhook `payment_intent.succeeded` n'écrit que `paymentStatus` : les deux
-- colonnes ne pouvaient pas diverger sur le chemin nominal. La redondance
-- remontait jusqu'à l'écran — le détail commande affichait DEUX badges pour le
-- même avancement, et le tiroir de filtres admin DEUX sections identiques.
--
-- ⚠️ `PENDING` désigne désormais deux situations : « pas encore payée » et
-- « payée, pas encore prise en main ». C'est `paymentStatus` qui désambiguïse —
-- exactement comme le faisait déjà la file « à expédier » (`to-ship.service.ts`).
-- Aucune information n'est perdue.

-- ---------------------------------------------------------------------------
-- 1. Backfill — AVANT le DROP COLUMN
-- ---------------------------------------------------------------------------
-- Seul cas où les deux axes divergeaient : `markAsReturned` posait
-- `fulfillmentStatus = RETURNED` en laissant `status = DELIVERED`. Ces lignes
-- doivent basculer sur la nouvelle valeur, sinon le retour est perdu.
UPDATE "Order" SET "status" = 'RETURNED' WHERE "fulfillmentStatus" = 'RETURNED';

-- Même chose dans l'audit trail : les entrées qui ne portaient la transition que
-- sur l'axe fulfillment deviennent des transitions de statut. `OrderHistory` est
-- immuable applicativement (Art. L123-22), mais une MIGRATION de structure qui
-- préserve l'information n'est pas une réécriture de l'historique — la perdre en
-- droppant les colonnes en serait une.
UPDATE "OrderHistory"
SET "previousStatus" = COALESCE("previousStatus", "previousFulfillmentStatus"::text::"OrderStatus"),
    "newStatus"      = COALESCE("newStatus",      "newFulfillmentStatus"::text::"OrderStatus")
WHERE ("newFulfillmentStatus" IS NOT NULL OR "previousFulfillmentStatus" IS NOT NULL)
  -- `UNFULFILLED` n'a pas d'équivalent littéral dans `OrderStatus` : le cast
  -- échouerait. Ces lignes correspondent à `PENDING`, traité juste après.
  AND COALESCE("newFulfillmentStatus"::text, '') <> 'UNFULFILLED'
  AND COALESCE("previousFulfillmentStatus"::text, '') <> 'UNFULFILLED';

UPDATE "OrderHistory"
SET "previousStatus" = COALESCE("previousStatus", 'PENDING'::"OrderStatus")
WHERE "previousFulfillmentStatus"::text = 'UNFULFILLED';

UPDATE "OrderHistory"
SET "newStatus" = COALESCE("newStatus", 'PENDING'::"OrderStatus")
WHERE "newFulfillmentStatus"::text = 'UNFULFILLED';

-- ---------------------------------------------------------------------------
-- 2. Colonnes, puis le type
-- ---------------------------------------------------------------------------
ALTER TABLE "OrderHistory" DROP COLUMN "previousFulfillmentStatus";
ALTER TABLE "OrderHistory" DROP COLUMN "newFulfillmentStatus";
ALTER TABLE "Order" DROP COLUMN "fulfillmentStatus";

DROP TYPE "FulfillmentStatus";
