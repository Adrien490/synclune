"use server";

import type { ActionState } from "@/shared/types/server-action";
import { removeFromWishlistSchema } from "@/modules/wishlist/schemas/wishlist.schemas";
import { readWishlistCookie, writeWishlistCookie } from "@/modules/wishlist/lib/wishlist-cookie";
import { WISHLIST_ERROR_MESSAGES } from "@/modules/wishlist/constants/error-messages";
import {
	validateInput,
	handleActionError,
	success,
	error,
	safeFormGet,
} from "@/shared/lib/actions";

/**
 * Server Action pour retirer un article des favoris
 * Compatible avec useActionState de React 19
 *
 * La wishlist vit entièrement dans le cookie `wishlist` (retrait de la base
 * 2026-08-03) — voir `toggle-wishlist-item.ts` pour le rationale complet.
 *
 * Note : ne valide volontairement PAS que le produit est encore actif —
 * on doit pouvoir retirer un produit désactivé (ou supprimé) de ses favoris.
 */
export async function removeFromWishlist(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Validation avec Zod
		const validated = validateInput(removeFromWishlistSchema, {
			productId: safeFormGet(formData, "productId"),
		});
		if ("error" in validated) return validated.error;

		const { productId } = validated.data;

		// 2. Le cookie est la SSOT — lecture validée (forme cuid2, dédup, cap)
		const ids = await readWishlistCookie();

		if (!ids.includes(productId)) {
			return error(WISHLIST_ERROR_MESSAGES.ITEM_NOT_FOUND);
		}

		// 3. Réécriture du cookie (maxAge glissant)
		await writeWishlistCookie(ids.filter((id) => id !== productId));

		return success("Retiré de tes favoris", { removed: true });
	} catch (e) {
		return handleActionError(e, WISHLIST_ERROR_MESSAGES.GENERAL_ERROR);
	}
}
