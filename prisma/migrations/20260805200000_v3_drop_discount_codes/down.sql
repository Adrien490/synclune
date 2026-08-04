-- Rollback du retrait des codes promo (2026-08-05).
--
-- Structurellement complet : le modèle, l'enum, les 3 colonnes, la FK et les
-- 7 CHECK reviennent à l'identique, et `Order_total_formula` retrouve son terme
-- de remise. Les DONNÉES, elles, ne reviennent pas — `DROP TABLE` est destructif
-- et aucune commande ne portait de remise (base sans données réelles au moment du
-- retrait). Les commandes existantes repartent donc à `discountAmount = 0`,
-- `discountCode`/`discountId` NULL, ce qui est cohérent avec leur `total`.
--
-- ⚠️ Recréer les colonnes NE RÉTABLIT PAS la fonctionnalité : `modules/discounts`
-- (100 fichiers), l'étape « code promo » du panier et du checkout, et le champ
-- `d` du cookie `cart` sont partis du CODE au même lot. Pour les rétablir :
-- `git revert` du commit applicatif.

-- 2. Le modèle et son enum
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

CREATE TABLE "Discount" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "type" "DiscountType" NOT NULL,
    "value" INTEGER NOT NULL,
    "minOrderAmount" INTEGER,
    "maxUsageCount" INTEGER,
    "maxUsagePerUser" INTEGER,
    "endsAt" TIMESTAMP(3),
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Discount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Discount_code_key" ON "Discount"("code");

ALTER TABLE "Discount" ADD CONSTRAINT "Discount_maxUsagePerUser_positive" CHECK ("maxUsagePerUser" IS NULL OR "maxUsagePerUser" > 0);
ALTER TABLE "Discount" ADD CONSTRAINT "Discount_minOrderAmount_positive" CHECK ("minOrderAmount" IS NULL OR "minOrderAmount" > 0);
ALTER TABLE "Discount" ADD CONSTRAINT "Discount_percentage_max_100" CHECK ("type" != 'PERCENTAGE' OR "value" <= 100);
ALTER TABLE "Discount" ADD CONSTRAINT "Discount_usageCount_non_negative" CHECK ("usageCount" >= 0);
ALTER TABLE "Discount" ADD CONSTRAINT "Discount_usageCount_within_limit" CHECK ("maxUsageCount" IS NULL OR "usageCount" <= "maxUsageCount");
ALTER TABLE "Discount" ADD CONSTRAINT "Discount_value_positive" CHECK ("value" > 0);

-- 1. Colonnes de commande
ALTER TABLE "Order" ADD COLUMN "discountAmount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "discountId" TEXT;
ALTER TABLE "Order" ADD COLUMN "discountCode" VARCHAR(30);

ALTER TABLE "Order" ADD CONSTRAINT "Order_discountId_fkey" FOREIGN KEY ("discountId") REFERENCES "Discount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_discountAmount_non_negative" CHECK ("discountAmount" >= 0);

ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_total_formula";
ALTER TABLE "Order" ADD CONSTRAINT "Order_total_formula" CHECK ("total" = GREATEST(0, "subtotal" - "discountAmount" + "shippingCost"));
