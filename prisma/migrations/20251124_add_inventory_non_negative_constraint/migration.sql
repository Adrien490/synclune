-- Contrainte CHECK pour garantir que l'inventaire ne peut jamais être négatif
-- Protection en profondeur au niveau PostgreSQL (en plus de la vérification applicative)
--
-- Si une opération tente de mettre inventory < 0, PostgreSQL retournera :
-- ERROR: new row for relation "ProductSku" violates check constraint "ProductSku_inventory_non_negative"

ALTER TABLE "ProductSku" ADD CONSTRAINT "ProductSku_inventory_non_negative"
CHECK (inventory >= 0);
