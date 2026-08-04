"use server";

import { validateInput, handleActionError, success, safeFormGet } from "@/shared/lib/actions";
import { CART_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";
import { readCartCookie, writeCartCookie } from "@/modules/cart/lib/cart-cookie";
import { checkCartRateLimit } from "@/modules/cart/lib/cart-rate-limit";
import { removeFromCartSchema } from "../schemas/cart.schemas";

/**
 * Server Action pour supprimer un article du panier
 * Compatible with useActionState de React 19
 *
 * ⚠️ Plus de garde d'ownership : le panier vit dans le cookie de l'appelant, il
 * ne peut par construction supprimer que sa propre ligne. L'IDOR que gardait
 * l'ancien `forbidden()` (deviner l'id d'un `CartItem` d'autrui) n'existe plus —
 * il n'y a plus de table où deviner un id.
 *
 * Rate limiting configuré via CART_LIMITS.REMOVE
 */
export async function removeFromCart(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Rate limiting
		const rateLimitResult = await checkCartRateLimit(CART_LIMITS.REMOVE);
		if (!rateLimitResult.success) {
			return rateLimitResult.errorState;
		}

		// 2. Validation avec Zod
		const validated = validateInput(removeFromCartSchema, {
			skuId: safeFormGet(formData, "skuId"),
		});
		if ("error" in validated) return validated.error;

		const { skuId } = validated.data;

		// 3. Retrait de la ligne. Une ligne absente n'est pas une erreur : le geste
		// est idempotent (double clic, onglet resté ouvert sur un panier déjà vidé).
		const cart = await readCartCookie();
		const items = cart.items.filter((item) => item.skuId !== skuId);

		if (items.length !== cart.items.length) {
			await writeCartCookie({ ...cart, items });
		}

		return success("Article supprimé du panier");
	} catch (e) {
		return handleActionError(e, "Impossible de supprimer l'article du panier");
	}
}
