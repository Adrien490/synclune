import { readWishlistCookie } from "@/modules/wishlist/lib/wishlist-cookie";

/**
 * Récupère tous les Product IDs présents dans les favoris du visiteur.
 *
 * Source : le cookie `wishlist` (SSOT depuis le retrait de la base 2026-08-03) —
 * aucune requête DB. Retourne un Set pour des lookups O(1) dans les listes de
 * produits.
 *
 * Le Set peut contenir l'id d'un produit archivé/supprimé depuis son ajout :
 * inoffensif, les surfaces consommatrices ne rendent que des produits PUBLIC,
 * un id périmé n'y matche donc jamais rien.
 *
 * @returns Set des Product IDs favoris (vide si pas de cookie)
 *
 * @example
 * ```tsx
 * const wishlistProductIds = await getWishlistProductIds();
 * const isInWishlist = wishlistProductIds.has(product.id);
 * ```
 */
export async function getWishlistProductIds(): Promise<Set<string>> {
	return new Set(await readWishlistCookie());
}
