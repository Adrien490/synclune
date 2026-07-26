-- Audit panier 2026-07-02 — résorption du drift schéma↔DB.
-- Ces colonnes (ajoutées par 20260417_cart_extensions) portaient les demi-features
-- notes de commande + emballage cadeau, retirées du schema.prisma et des Server
-- Actions (set-cart-notes / set-gift-options supprimées) sans migration DROP :
-- elles existaient encore en base, invisibles pour Prisma.
-- Aucune donnée métier perdue : jamais écrites hors seed de dev.

ALTER TABLE "Cart" DROP COLUMN "notes";

ALTER TABLE "CartItem" DROP COLUMN "giftWrap";
ALTER TABLE "CartItem" DROP COLUMN "giftMessage";
