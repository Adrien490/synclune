-- Retrait du panier en base (2026-08-04) : le panier vit désormais entièrement
-- dans le cookie httpOnly `cart` (lignes SKU + quantité + prix témoin, et code
-- promo appliqué — modules/cart/lib/cart-cookie.ts, 7 jours glissants), sur le
-- modèle de la wishlist passée en cookie la veille (20260803210000).
--
-- Conséquences :
--   * plus de purge à exécuter : la passe `cleanupExpiredCarts()` de la route
--     cron `cleanup-pending-orders` est retirée avec ce chantier (le cookie
--     expire tout seul côté client) ;
--   * les 3 gardes bruts `Cart_owner_required`, `CartItem_priceAtAdd_positive`
--     et `CartItem_quantity_positive` sortent de prisma/sql/raw-guards.sql ;
--   * la FK `CartItem.skuId → ProductSku` en `onDelete: Restrict` disparaît :
--     `delete-sku` ne peut plus (ni n'a besoin de) refuser la suppression d'une
--     variante « présente dans N paniers » — le serveur n'a plus aucune
--     visibilité sur les paniers des visiteurs ;
--   * le compteur FOMO « Dans X paniers » de la PDP disparaît : il agrégeait les
--     paniers des AUTRES visiteurs, ce qu'un cookie ne permet structurellement
--     pas ;
--   * le vidage post-paiement quitte le webhook Stripe (appel serveur-à-serveur,
--     sans cookie client) pour la page `/paiement/confirmation`.
--
-- Les données existantes sont volontairement perdues : un panier est un état de
-- navigation sans valeur légale ni comptable (aucun lien avec Order — les lignes
-- de commande sont des snapshots figés au checkout), et les paniers invités
-- étaient déjà purgés à expiration + 23 j de grâce.

-- DropTable (enfant d'abord — FK CartItem_cartId_fkey)
DROP TABLE IF EXISTS "CartItem";

-- DropTable
DROP TABLE IF EXISTS "Cart";
