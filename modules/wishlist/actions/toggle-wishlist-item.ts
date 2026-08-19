"use server";

import type { ActionState } from "@/shared/types/server-action";
import { toggleWishlistItemSchema } from "@/modules/wishlist/schemas/wishlist.schemas";
import { readWishlistCookie, writeWishlistCookie } from "@/modules/wishlist/lib/wishlist-cookie";
import { addProductIdToWishlist } from "@/modules/wishlist/lib/add-product-id-to-wishlist";
import { WISHLIST_ERROR_MESSAGES } from "@/modules/wishlist/constants/error-messages";
import {
	validateInput,
	handleActionError,
	success,
	error,
	safeFormGet,
} from "@/shared/lib/actions";

/**
 * Server Action pour toggle un article dans les favoris
 * Si présent → retire, si absent → ajoute
 *
 * La wishlist vit entièrement dans le cookie `wishlist` (retrait de la base
 * 2026-08-03) : la mutation est une réécriture du cookie, seule la validation
 * « produit actif » à l'ajout touche la DB. Pas d'invalidation de cache —
 * poser le cookie déclenche déjà le re-rendu avec la nouvelle valeur, et la
 * matérialisation produits est cachée sur les ARGUMENTS (nouvelle liste =
 * nouvelle clé).
 *
 * Pattern:
 * 1. Validation des données (Zod)
 * 2. Lecture du cookie → retrait ou ajout (cap + produit actif)
 * 3. Réécriture du cookie (maxAge glissant)
 */
export async function toggleWishlistItem(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Validation avec Zod
		const validated = validateInput(toggleWishlistItemSchema, {
			productId: safeFormGet(formData, "productId"),
		});
		if ("error" in validated) return validated.error;

		const { productId } = validated.data;

		// 2. Le cookie est la SSOT — lecture validée (forme cuid2, dédup, cap)
		const ids = await readWishlistCookie();

		// Path "remove" : présent → retire
		if (ids.includes(productId)) {
			await writeWishlistCookie(ids.filter((id) => id !== productId));
			return success("Retiré de tes favoris", { action: "removed" as const });
		}

		// 3. Path "add" : chemin partagé avec `addToWishlist` (cap + garde
		//    produit actif + écriture en tête). "already-present" est
		//    inatteignable ici — le path "remove" vient de traiter ce cas.
		const outcome = await addProductIdToWishlist(ids, productId);

		if (outcome === "list-full") return error(WISHLIST_ERROR_MESSAGES.WISHLIST_FULL);
		if (outcome === "product-unavailable") {
			return error(WISHLIST_ERROR_MESSAGES.PRODUCT_NOT_PUBLIC);
		}

		return success("Ajouté à tes favoris", { action: "added" as const });
	} catch (e) {
		return handleActionError(e, WISHLIST_ERROR_MESSAGES.GENERAL_ERROR);
	}
}
