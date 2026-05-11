"use server";

import { updateTag } from "next/cache";
import { prisma } from "@/shared/lib/prisma";
import { getCartInvalidationTags, CART_CACHE_TAGS } from "@/modules/cart/constants/cache";
import { CART_LIMITS } from "@/shared/lib/rate-limit-config";
import { handleActionError, success, error, validateInput } from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
import { checkCartRateLimit } from "@/modules/cart/lib/cart-rate-limit";
import { removeMultipleItemsSchema } from "../schemas/cart.schemas";
import { CART_ERROR_MESSAGES } from "../constants/error-messages";

/**
 * Server Action pour supprimer plusieurs items du panier en une seule operation
 *
 * Complete removeUnavailableItems (system-driven) par une variante user-driven
 * pour UX bulk-select.
 *
 * Rate limiting via CART_LIMITS.REMOVE
 */
export async function removeMultipleItems(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const rateLimitResult = await checkCartRateLimit(CART_LIMITS.REMOVE);
		if (!rateLimitResult.success) {
			return rateLimitResult.errorState;
		}
		const { userId, sessionId } = rateLimitResult.context;

		// Parse cart item IDs (JSON array or comma-separated)
		const raw = formData.get("cartItemIds");
		let cartItemIds: string[] = [];
		if (typeof raw === "string") {
			try {
				const parsed: unknown = JSON.parse(raw);
				if (Array.isArray(parsed)) {
					cartItemIds = parsed.filter((v): v is string => typeof v === "string");
				}
			} catch {
				cartItemIds = raw
					.split(",")
					.map((s) => s.trim())
					.filter(Boolean);
			}
		}

		const validated = validateInput(removeMultipleItemsSchema, { cartItemIds });
		if ("error" in validated) return validated.error;
		const { cartItemIds: validatedIds } = validated.data;

		if (!userId && !sessionId) {
			return error(CART_ERROR_MESSAGES.CART_NOT_FOUND);
		}

		// Recuperer le panier (ownership via userId/sessionId, no IDOR)
		const cart = await prisma.cart.findFirst({
			where: {
				...(userId ? { userId } : { sessionId: sessionId! }),
				OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
			},
			select: {
				id: true,
				items: {
					where: { id: { in: validatedIds } },
					select: { id: true, sku: { select: { productId: true } } },
				},
			},
		});

		if (!cart) {
			return error(CART_ERROR_MESSAGES.CART_NOT_FOUND);
		}

		const ownedIds = cart.items.map((item) => item.id);
		if (ownedIds.length === 0) {
			return error("Aucun article valide à supprimer");
		}

		// Transaction atomique
		await prisma.$transaction(async (tx) => {
			await tx.cartItem.deleteMany({ where: { id: { in: ownedIds }, cartId: cart.id } });
			await tx.cart.update({
				where: { id: cart.id },
				data: { updatedAt: new Date() },
			});
		});

		// Cache invalidation
		const tags = getCartInvalidationTags(userId, sessionId ?? undefined);
		tags.forEach((tag) => updateTag(tag));

		const productIds = new Set(cart.items.map((item) => item.sku.productId));
		productIds.forEach((pid) => updateTag(CART_CACHE_TAGS.PRODUCT_CARTS(pid)));

		const removedCount = ownedIds.length;
		return success(removedCount > 1 ? `${removedCount} articles supprimés` : "Article supprimé", {
			removedCount,
		});
	} catch (e) {
		return handleActionError(e, "Impossible de supprimer les articles");
	}
}
