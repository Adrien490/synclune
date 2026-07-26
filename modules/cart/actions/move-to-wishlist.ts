"use server";

import { updateTag } from "next/cache";
import { prisma } from "@/shared/lib/prisma";
import { getCartInvalidationTags, CART_CACHE_TAGS } from "@/modules/cart/constants/cache";
import { getWishlistInvalidationTags } from "@/modules/wishlist/constants/cache";
import { CART_LIMITS } from "@/shared/lib/rate-limit-config";
import {
	validateInput,
	handleActionError,
	success,
	error,
	forbidden,
	safeFormGet,
} from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
import { checkCartRateLimit } from "@/modules/cart/lib/cart-rate-limit";
import { moveToWishlistSchema } from "../schemas/cart.schemas";
import { WISHLIST_MAX_ITEMS } from "@/modules/wishlist/constants/wishlist.constants";
import {
	WISHLIST_ERROR_MESSAGES,
	WISHLIST_FULL_SENTINEL,
} from "@/modules/wishlist/constants/error-messages";
import { CART_ERROR_MESSAGES } from "../constants/error-messages";

/**
 * Server Action pour deplacer un item du panier vers la wishlist
 *
 * Alternative premium a removeFromCart : preserve l'intention d'achat (bijoux
 * artisanaux = panier moyen eleve, hesitation frequente).
 *
 * Flow atomique (transaction) :
 * 1. Verifier ownership du cart item
 * 2. Ajouter le Product a la wishlist (idempotent si deja present)
 * 3. Supprimer le CartItem
 * 4. Invalider caches cart + wishlist + product
 *
 * Rate limiting via CART_LIMITS.REMOVE (meme impact que removeFromCart).
 */
export async function moveToWishlist(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const rateLimitResult = await checkCartRateLimit(CART_LIMITS.REMOVE);
		if (!rateLimitResult.success) {
			return rateLimitResult.errorState;
		}
		const { userId, sessionId } = rateLimitResult.context;

		const rawData = { cartItemId: safeFormGet(formData, "cartItemId") };
		const validated = validateInput(moveToWishlistSchema, rawData);
		if ("error" in validated) return validated.error;
		const { cartItemId } = validated.data;

		// Recup cart item + ownership + productId
		const cartItem = await prisma.cartItem.findUnique({
			where: { id: cartItemId },
			select: {
				id: true,
				cartId: true,
				cart: { select: { userId: true, sessionId: true } },
				sku: { select: { productId: true, product: { select: { status: true } } } },
			},
		});

		if (!cartItem) {
			return forbidden();
		}

		const isOwner = userId
			? cartItem.cart.userId === userId
			: cartItem.cart.sessionId === sessionId;
		if (!isOwner) {
			return forbidden();
		}

		if (cartItem.sku.product.status !== "PUBLIC") {
			return error(CART_ERROR_MESSAGES.PRODUCT_NOT_PUBLIC);
		}

		const productId = cartItem.sku.productId;

		// Transaction atomique: move = wishlist upsert + cartItem delete
		const result = await prisma.$transaction(async (tx) => {
			// 1. Upsert wishlist (share same session/user as cart)
			const wishlist = await tx.wishlist.upsert({
				where: userId ? { userId } : { sessionId: sessionId! },
				create: {
					userId: userId ?? null,
					sessionId: sessionId ?? null,
				},
				update: {},
				select: { id: true },
			});

			// 2. Check if already in wishlist (idempotent)
			const existing = await tx.wishlistItem.findFirst({
				where: { wishlistId: wishlist.id, productId },
				select: { id: true },
			});

			let alreadyInWishlist = false;
			if (existing) {
				alreadyInWishlist = true;
			} else {
				// 3. Check max items
				const itemCount = await tx.wishlistItem.count({
					where: { wishlistId: wishlist.id },
				});
				if (itemCount >= WISHLIST_MAX_ITEMS) {
					throw new Error(WISHLIST_FULL_SENTINEL);
				}

				await tx.wishlistItem.create({
					data: { wishlistId: wishlist.id, productId },
				});
			}

			// 4. Delete cart item + refresh cart timestamp
			await tx.cartItem.delete({ where: { id: cartItemId } });
			await tx.cart.update({
				where: { id: cartItem.cartId },
				data: { updatedAt: new Date() },
			});

			return { alreadyInWishlist };
		});

		// Invalidate caches
		const cartTags = getCartInvalidationTags(userId, sessionId ?? undefined);
		const wishlistTags = getWishlistInvalidationTags(userId, sessionId ?? undefined);
		[...cartTags, ...wishlistTags].forEach((tag) => updateTag(tag));
		updateTag(CART_CACHE_TAGS.PRODUCT_CARTS(productId));

		return success(
			result.alreadyInWishlist ? "Article déjà dans la wishlist" : "Déplacé vers la wishlist",
			{ productId },
		);
	} catch (e) {
		if (e instanceof Error && e.message === WISHLIST_FULL_SENTINEL) {
			return error(WISHLIST_ERROR_MESSAGES.WISHLIST_FULL);
		}
		return handleActionError(e, "Impossible de déplacer vers la wishlist");
	}
}
