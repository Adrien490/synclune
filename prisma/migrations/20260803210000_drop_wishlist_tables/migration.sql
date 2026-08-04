-- Retrait de la wishlist en base (2026-08-03) : les favoris vivent désormais
-- entièrement dans le cookie httpOnly `wishlist` (JSON array de Product IDs,
-- 30 jours glissants — modules/wishlist/lib/wishlist-cookie.ts).
--
-- Conséquences :
--   * plus de purge RGPD à exécuter (le cookie expire tout seul côté client) —
--     la passe `cleanupInactiveWishlists()` de la route cron
--     `cleanup-pending-orders` est retirée avec ce chantier ;
--   * le garde brut `Wishlist_owner_required` sort de prisma/sql/raw-guards.sql ;
--   * les données existantes sont volontairement perdues : la wishlist est un
--     confort de navigation sans valeur légale ni comptable (aucun lien avec
--     Order), et les lignes invitées étaient déjà purgées à 30 j + 7 j de grâce.

-- DropTable (enfant d'abord — FK WishlistItem_wishlistId_fkey)
DROP TABLE IF EXISTS "WishlistItem";

-- DropTable
DROP TABLE IF EXISTS "Wishlist";
