"use server";

import { updateTag } from "next/cache";
import {
	validateInput,
	handleActionError,
	success,
	error,
	safeFormGet,
} from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import { getCartInvalidationTags, CART_CACHE_TAGS } from "@/modules/cart/constants/cache";
import { getWishlistInvalidationTags } from "@/modules/wishlist/constants/cache";
import { CART_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";
import { checkCartRateLimit } from "@/modules/cart/lib/cart-rate-limit";
import { removeFromCartSchema } from "../schemas/cart.schemas";
import {
	getOrCreateWishlistSessionId,
	getWishlistExpirationDate,
} from "@/modules/wishlist/lib/wishlist-session";
import { getSession } from "@/modules/auth/lib/get-current-session";

/**
 * Server Action to move a cart item to the wishlist
 * Removes from cart + adds product to wishlist in a single operation
 */
export async function moveToWishlist(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Rate limiting
		const rateLimitResult = await checkCartRateLimit(CART_LIMITS.REMOVE);
		if (!rateLimitResult.success) {
			return rateLimitResult.errorState;
		}
		const { userId, sessionId } = rateLimitResult.context;

		// 2. Validate cart item ID
		const rawData = { cartItemId: safeFormGet(formData, "cartItemId") };
		const validated = validateInput(removeFromCartSchema, rawData);
		if ("error" in validated) return validated.error;

		// 3. Get cart item with product info
		const cartItem = await prisma.cartItem.findUnique({
			where: { id: validated.data.cartItemId },
			include: {
				cart: true,
				sku: { select: { productId: true } },
			},
		});

		if (!cartItem) {
			return error("Article introuvable dans le panier");
		}

		// 4. Verify ownership
		const isOwner = userId
			? cartItem.cart.userId === userId
			: cartItem.cart.sessionId === sessionId;

		if (!isOwner) {
			return error("Accès non autorisé");
		}

		const productId = cartItem.sku.productId;

		// 5. Get session and wishlist context
		const session = await getSession();
		const wishlistUserId = session?.user.id ?? null;
		const wishlistSessionId = wishlistUserId ? null : await getOrCreateWishlistSessionId();

		// 6. Transaction: remove from cart + add to wishlist
		await prisma.$transaction(async (tx) => {
			// Remove from cart
			await tx.cartItem.delete({
				where: { id: validated.data.cartItemId },
			});

			await tx.cart.update({
				where: { id: cartItem.cartId },
				data: { updatedAt: new Date() },
			});

			// Upsert wishlist + add item (ignore if already in wishlist)
			const wishlist = await tx.wishlist.upsert({
				where: wishlistUserId ? { userId: wishlistUserId } : { sessionId: wishlistSessionId! },
				create: {
					userId: wishlistUserId,
					sessionId: wishlistSessionId,
					expiresAt: wishlistUserId ? null : getWishlistExpirationDate(),
				},
				update: {},
			});

			// Only add if not already in wishlist
			const existing = await tx.wishlistItem.findFirst({
				where: { wishlistId: wishlist.id, productId },
			});

			if (!existing) {
				await tx.wishlistItem.create({
					data: { wishlistId: wishlist.id, productId },
				});
			}
		});

		// 7. Invalidate caches
		const cartTags = getCartInvalidationTags(userId, sessionId ?? undefined);
		cartTags.forEach((tag) => updateTag(tag));
		updateTag(CART_CACHE_TAGS.PRODUCT_CARTS(productId));

		const wishlistTags = getWishlistInvalidationTags(
			wishlistUserId ?? undefined,
			wishlistSessionId ?? undefined,
		);
		wishlistTags.forEach((tag) => updateTag(tag));

		return success("Article déplacé vers vos favoris");
	} catch (e) {
		return handleActionError(e, "Impossible de déplacer l'article vers les favoris");
	}
}
