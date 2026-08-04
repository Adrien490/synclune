"use server";

import { CART_LIMITS } from "@/shared/lib/rate-limit-config";
import { handleActionError, success, error } from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
import { readCartCookie, writeCartCookie } from "@/modules/cart/lib/cart-cookie";
import { checkCartRateLimit } from "@/modules/cart/lib/cart-rate-limit";
import { CART_ERROR_MESSAGES } from "../constants/error-messages";

/**
 * Server Action pour retirer le code promo applique au panier
 *
 * Rate limiting configure via CART_LIMITS.DISCOUNT
 */
export async function removeCartDiscount(
	_: ActionState | undefined,
	__formData?: FormData,
): Promise<ActionState> {
	try {
		const rateLimitResult = await checkCartRateLimit(CART_LIMITS.DISCOUNT);
		if (!rateLimitResult.success) {
			return rateLimitResult.errorState;
		}

		const cart = await readCartCookie();

		if (!cart.discountCode) {
			return error(CART_ERROR_MESSAGES.DISCOUNT_CODE_NOT_APPLIED);
		}

		await writeCartCookie({ ...cart, discountCode: null });

		return success("Code promo retiré du panier");
	} catch (e) {
		return handleActionError(e, "Impossible de retirer le code promo");
	}
}
