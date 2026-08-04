-- Rollback de l'audit du module `orders` (2026-08-05) — colonnes write-only.
--
-- Structurellement complet, mais ⚠️ SANS RESTAURATION DES DONNÉES : les valeurs
-- d'`OrderHistory.authorId` et d'`OrderItem.productId` sont perdues au `DROP
-- COLUMN`. Les colonnes reviennent NULL sur toutes les lignes existantes.
--
-- C'est sans conséquence, et c'est même l'argument du lot : ces deux colonnes
-- n'avaient aucun lecteur. Restaurer leur contenu supposerait de le reconstruire
-- (l'unique compte admin pour `authorId`, un join `OrderItem → ProductSku →
-- Product` pour `productId`) — inutile tant que rien ne les relit.
--
-- Noms, types et `onDelete` repris à l'identique de `0_init`, pour que la base
-- revienne exactement à l'état que le baseline construit.

-- 4. Refund : index
CREATE INDEX "Refund_status_stripeRefundId_idx" ON "Refund"("status", "stripeRefundId");

-- 3. PaymentMethod : réintroduction des 3 valeurs
--
-- Aucune garde nécessaire ici : on ÉLARGIT l'enum, tout cast existant reste
-- valide. L'ordre des membres est celui de `0_init`.
CREATE TYPE "PaymentMethod_old" AS ENUM ('CARD', 'SEPA_DEBIT', 'KLARNA', 'LINK', 'WALLET', 'BANCONTACT', 'OTHER');

ALTER TABLE "Order"
  ALTER COLUMN "paymentMethod" DROP DEFAULT,
  ALTER COLUMN "paymentMethod" TYPE "PaymentMethod_old"
    USING ("paymentMethod"::text::"PaymentMethod_old"),
  ALTER COLUMN "paymentMethod" SET DEFAULT 'CARD';

DROP TYPE "PaymentMethod";
ALTER TYPE "PaymentMethod_old" RENAME TO "PaymentMethod";

-- ⚠️ Recréer les valeurs d'enum NE RÉTABLIT PAS la capacité d'encaisser ces
-- moyens : le checkout reste card-only (`payment_method_types: ["card"]`) et
-- `map-stripe-payment-method.ts` n'a plus leurs lignes de mapping. Un rollback DB
-- seul laisse donc 3 valeurs inertes. Pour les rouvrir : `git revert` du commit
-- applicatif, PUIS élargir `payment_method_types`.

-- 2. OrderItem.productId (colonne, FK, index)
ALTER TABLE "OrderItem" ADD COLUMN "productId" TEXT;
ALTER TABLE "OrderItem"
  ADD CONSTRAINT "OrderItem_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

-- 1. OrderHistory.authorId
ALTER TABLE "OrderHistory" ADD COLUMN "authorId" TEXT;
