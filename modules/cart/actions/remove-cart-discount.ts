"use server";

import { updateTag } from "next/cache";
import { prisma } from "@/shared/lib/prisma";
import { getCartInvalidationTags } from "@/modules/cart/constants/cache";
import { CART_LIMITS } from "@/shared/lib/rate-limit-config";
import { handleActionError, success, error } from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
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
		const { userId, sessionId } = rateLimitResult.context;

		if (!userId && !sessionId) {
			return error(CART_ERROR_MESSAGES.CART_NOT_FOUND);
		}

		const cart = await prisma.cart.findFirst({
			where: userId ? { userId } : { sessionId: sessionId! },
			select: { id: true, appliedDiscountCode: true },
		});

		if (!cart) {
			return error(CART_ERROR_MESSAGES.CART_NOT_FOUND);
		}

		if (!cart.appliedDiscountCode) {
			return error(CART_ERROR_MESSAGES.DISCOUNT_CODE_NOT_APPLIED);
		}

		await prisma.cart.update({
			where: { id: cart.id },
			data: {
				appliedDiscountCode: null,
				discountAmountCache: null,
				updatedAt: new Date(),
			},
		});

		const tags = getCartInvalidationTags(userId, sessionId ?? undefined);
		tags.forEach((tag) => updateTag(tag));

		return success("Code promo retiré du panier");
	} catch (e) {
		return handleActionError(e, "Impossible de retirer le code promo");
	}
}
