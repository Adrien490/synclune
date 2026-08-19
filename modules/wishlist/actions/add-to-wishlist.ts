"use server";

import type { ActionState } from "@/shared/types/server-action";
import { addToWishlistSchema } from "@/modules/wishlist/schemas/wishlist.schemas";
import { readWishlistCookie } from "@/modules/wishlist/lib/wishlist-cookie";
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
 * Server Action pour ajouter un article aux favoris
 * Compatible avec useActionState de React 19
 *
 * Idempotente : un produit déjà présent est un succès (« Déjà dans tes
 * favoris ») — c'est le chemin de l'undo toast après un retrait.
 *
 * La wishlist vit entièrement dans le cookie `wishlist` (retrait de la base
 * 2026-08-03) — voir `toggle-wishlist-item.ts` pour le rationale complet.
 */
export async function addToWishlist(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Validation avec Zod
		const validated = validateInput(addToWishlistSchema, {
			productId: safeFormGet(formData, "productId"),
		});
		if ("error" in validated) return validated.error;

		const { productId } = validated.data;

		// 2. Le cookie est la SSOT — lecture validée (forme cuid2, dédup, cap)
		const ids = await readWishlistCookie();

		// 3. Chemin d'ajout partagé avec `toggleWishlistItem` (cap + garde
		//    produit actif + écriture en tête — SSOT `lib/add-product-id-to-wishlist`)
		const outcome = await addProductIdToWishlist(ids, productId);

		if (outcome === "already-present") return success("Déjà dans tes favoris");
		if (outcome === "list-full") return error(WISHLIST_ERROR_MESSAGES.WISHLIST_FULL);
		if (outcome === "product-unavailable") {
			return error(WISHLIST_ERROR_MESSAGES.PRODUCT_NOT_PUBLIC);
		}

		return success("Ajouté à tes favoris");
	} catch (e) {
		return handleActionError(e, WISHLIST_ERROR_MESSAGES.GENERAL_ERROR);
	}
}
