"use server";

import { handleActionError, success } from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
import { clearCartCookie, readCartCookie } from "@/modules/cart/lib/cart-cookie";
import { CART_ERROR_MESSAGES } from "../constants/error-messages";

/**
 * Server Action pour vider integralement le panier
 * Compatible avec useActionState de React 19
 *
 * Supprime le cookie `cart` : lignes ET code promo partent ensemble.
 *
 */
export async function clearCart(
	_: ActionState | undefined,
	__formData?: FormData,
): Promise<ActionState> {
	try {
		// 2. Compter avant de vider (le message reprend le nombre d'articles retirés)
		const cart = await readCartCookie();
		const initialCount = cart.items.length;

		if (initialCount === 0) {
			return success(CART_ERROR_MESSAGES.CART_ALREADY_EMPTY, { clearedCount: 0 });
		}

		await clearCartCookie();

		return success(
			initialCount > 1 ? `${initialCount} articles supprimés du panier` : "Panier vidé avec succès",
			{ clearedCount: initialCount },
		);
	} catch (e) {
		return handleActionError(e, "Impossible de vider le panier");
	}
}
