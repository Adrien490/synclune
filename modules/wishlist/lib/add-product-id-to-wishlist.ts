import { prisma } from "@/shared/lib/prisma";
import { WISHLIST_MAX_ITEMS } from "@/modules/wishlist/constants/wishlist.constants";
import { writeWishlistCookie } from "./wishlist-cookie";

export type WishlistAddOutcome = "added" | "already-present" | "list-full" | "product-unavailable";

/**
 * Chemin « ajout » de la wishlist — SSOT partagée entre `addToWishlist` et le
 * path add de `toggleWishlistItem` (avant l'extraction du 2026-08-19, les deux
 * actions dupliquaient cap + garde produit + écriture, et pouvaient diverger).
 *
 * Vit dans `lib/` et PAS dans un module `"use server"` : un helper exporté
 * depuis un fichier `"use server"` deviendrait un endpoint RPC public aux
 * arguments arbitraires — ce sont les actions appelantes qui valident.
 *
 * @param ids - Liste courante (déjà lue ET validée par `readWishlistCookie`)
 * @param productId - Product ID à ajouter (déjà validé cuid2 par l'action)
 */
export async function addProductIdToWishlist(
	ids: string[],
	productId: string,
): Promise<WishlistAddOutcome> {
	// Idempotent : un produit déjà présent est un succès (chemin de l'undo toast)
	if (ids.includes(productId)) {
		return "already-present";
	}

	if (ids.length >= WISHLIST_MAX_ITEMS) {
		return "list-full";
	}

	// Un id n'entre dans le cookie que s'il désigne un produit réellement actif —
	// sinon n'importe quel cuid2 forgé gonflerait la liste et le badge.
	const product = await prisma.product.findUnique({
		where: { id: productId, active: true },
		select: { id: true },
	});
	if (!product) {
		return "product-unavailable";
	}

	// Plus récent en premier — l'ordre du cookie est l'ordre d'affichage
	await writeWishlistCookie([productId, ...ids]);
	return "added";
}
