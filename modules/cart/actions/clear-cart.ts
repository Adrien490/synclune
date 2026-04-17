"use server";

import { updateTag } from "next/cache";
import { prisma } from "@/shared/lib/prisma";
import { getCartInvalidationTags, CART_CACHE_TAGS } from "@/modules/cart/constants/cache";
import { CART_LIMITS } from "@/shared/lib/rate-limit-config";
import { handleActionError, success, error } from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
import { checkCartRateLimit } from "@/modules/cart/lib/cart-rate-limit";
import { CART_ERROR_MESSAGES } from "../constants/error-messages";

/**
 * Server Action pour vider integralement le panier
 * Compatible avec useActionState de React 19
 *
 * Supprime tous les items et reinitialise les metadonnees (discount, notes).
 * Ne supprime pas le Cart lui-meme pour preserver les infos de session.
 *
 * Rate limiting configure via CART_LIMITS.CLEAR
 */
export async function clearCart(
	_: ActionState | undefined,
	__formData?: FormData,
): Promise<ActionState> {
	try {
		// 1. Rate limiting + contexte
		const rateLimitResult = await checkCartRateLimit(CART_LIMITS.CLEAR);
		if (!rateLimitResult.success) {
			return rateLimitResult.errorState;
		}
		const { userId, sessionId } = rateLimitResult.context;

		if (!userId && !sessionId) {
			return error(CART_ERROR_MESSAGES.CART_NOT_FOUND);
		}

		// 2. Recuperer le panier (ownership via userId/sessionId, no IDOR risk)
		const cart = await prisma.cart.findFirst({
			where: userId ? { userId } : { sessionId: sessionId! },
			select: {
				id: true,
				items: {
					select: {
						sku: { select: { productId: true } },
					},
				},
			},
		});

		if (!cart) {
			return error(CART_ERROR_MESSAGES.CART_NOT_FOUND);
		}

		const initialCount = cart.items.length;
		if (initialCount === 0) {
			return success(CART_ERROR_MESSAGES.CART_ALREADY_EMPTY, { clearedCount: 0 });
		}

		// 3. Transaction atomique: deleteMany + reset metadata
		await prisma.$transaction(async (tx) => {
			await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
			await tx.cart.update({
				where: { id: cart.id },
				data: {
					appliedDiscountCode: null,
					discountAmountCache: null,
					notes: null,
					updatedAt: new Date(),
				},
			});
		});

		// 4. Cache invalidation (cart + product FOMO pour chaque produit supprime)
		const tags = getCartInvalidationTags(userId, sessionId ?? undefined);
		tags.forEach((tag) => updateTag(tag));

		const productIds = new Set(cart.items.map((item) => item.sku.productId));
		productIds.forEach((productId) => {
			updateTag(CART_CACHE_TAGS.PRODUCT_CARTS(productId));
		});

		return success(
			initialCount > 1 ? `${initialCount} articles supprimés du panier` : "Panier vidé avec succès",
			{ clearedCount: initialCount },
		);
	} catch (e) {
		return handleActionError(e, "Impossible de vider le panier");
	}
}
