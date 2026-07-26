-- Rollback : ré-ajout des colonnes avec leurs types d'origine (20260417_cart_extensions).
-- Les données droppées ne sont pas restaurables (jamais écrites hors seed de dev).

ALTER TABLE "Cart" ADD COLUMN "notes" VARCHAR(500);

ALTER TABLE "CartItem" ADD COLUMN "giftWrap" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CartItem" ADD COLUMN "giftMessage" VARCHAR(300);
