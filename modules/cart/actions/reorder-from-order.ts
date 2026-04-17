"use server";

import { updateTag } from "next/cache";
import { prisma } from "@/shared/lib/prisma";
import { getCartInvalidationTags, CART_CACHE_TAGS } from "@/modules/cart/constants/cache";
import { CART_LIMITS } from "@/shared/lib/rate-limit-config";
import {
	validateInput,
	handleActionError,
	success,
	error,
	safeFormGet,
} from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
import { getSession } from "@/modules/auth/lib/get-current-session";
import { getOrCreateCartSessionId } from "@/modules/cart/lib/cart-session";
import { checkCartRateLimit } from "@/modules/cart/lib/cart-rate-limit";
import { reorderFromOrderSchema } from "../schemas/cart.schemas";
import { CART_ERROR_MESSAGES } from "../constants/error-messages";
import { MAX_CART_ITEMS, MAX_QUANTITY_PER_ORDER } from "../constants/cart";

/**
 * Server Action pour recharger au panier les items d'une commande precedente
 *
 * Use case : Returning customers achetent regulierement les memes references
 * (cadeaux recurrents, collections favorite). Clone l'ordre dans le cart en
 * respectant stock actuel, statut du SKU, et limites cart.
 *
 * Rules :
 * - Auth required (utilisateurs connectes uniquement)
 * - Only own orders
 * - Skip SKU inactif / produit archive / supprime
 * - Quantite bornee par MAX_QUANTITY_PER_ORDER et stock actuel
 * - Items fusionnes avec le panier existant (MAX strategy comme mergeCarts)
 *
 * Rate limiting via CART_LIMITS.REORDER
 */
export async function reorderFromOrder(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const rateLimitResult = await checkCartRateLimit(CART_LIMITS.REORDER);
		if (!rateLimitResult.success) {
			return rateLimitResult.errorState;
		}

		// Reorder = auth required (protection privacy: enum orders)
		const session = await getSession();
		const userId = session?.user.id;
		if (!userId) {
			return error("Vous devez être connecté pour cette action");
		}

		const rawData = { orderId: safeFormGet(formData, "orderId") };
		const validated = validateInput(reorderFromOrderSchema, rawData);
		if ("error" in validated) return validated.error;
		const { orderId } = validated.data;

		// Ownership: verify order belongs to current user
		const order = await prisma.order.findFirst({
			where: { id: orderId, userId },
			select: {
				id: true,
				items: {
					select: {
						skuId: true,
						quantity: true,
						sku: {
							select: {
								id: true,
								inventory: true,
								isActive: true,
								priceInclTax: true,
								deletedAt: true,
								product: {
									select: { id: true, title: true, status: true, deletedAt: true },
								},
							},
						},
					},
				},
			},
		});

		if (!order) {
			return error("Commande introuvable");
		}

		// Filter items that are still available
		const eligibleItems = order.items.filter(
			(item) =>
				item.sku.isActive &&
				!item.sku.deletedAt &&
				item.sku.product.status === "PUBLIC" &&
				!item.sku.product.deletedAt &&
				item.sku.inventory > 0,
		);

		if (eligibleItems.length === 0) {
			return error("Aucun article de cette commande n'est disponible");
		}

		// Ensure cart exists (user or create session-based - user is connected so always userId branch)
		const sessionId = !userId ? await getOrCreateCartSessionId() : null;

		const cart = await prisma.cart.upsert({
			where: { userId },
			create: { userId, expiresAt: null },
			update: { updatedAt: new Date() },
			select: {
				id: true,
				items: {
					select: { id: true, skuId: true, quantity: true },
				},
			},
		});

		const existingBySku = new Map(cart.items.map((it) => [it.skuId, it]));
		const availableSlots = Math.max(0, MAX_CART_ITEMS - cart.items.length);

		let reorderedCount = 0;
		let skippedCount = 0;
		let truncatedCount = 0;
		let slotsConsumed = 0;

		await prisma.$transaction(async (tx) => {
			for (const orderItem of eligibleItems) {
				const sku = orderItem.sku;
				const existing = existingBySku.get(orderItem.skuId);
				const requested = orderItem.quantity;
				const capByStock = Math.min(requested, sku.inventory);
				const capByLimit = Math.min(capByStock, MAX_QUANTITY_PER_ORDER);

				if (existing) {
					// Merge MAX strategy, borne stock + limits
					const merged = Math.min(
						Math.max(existing.quantity, capByLimit),
						sku.inventory,
						MAX_QUANTITY_PER_ORDER,
					);
					if (merged !== existing.quantity) {
						await tx.cartItem.update({
							where: { id: existing.id },
							data: { quantity: merged },
						});
					}
					reorderedCount++;
				} else {
					// Check cart items limit
					if (slotsConsumed >= availableSlots) {
						truncatedCount++;
						continue;
					}
					if (capByLimit <= 0) {
						skippedCount++;
						continue;
					}
					await tx.cartItem.create({
						data: {
							cartId: cart.id,
							skuId: orderItem.skuId,
							quantity: capByLimit,
							priceAtAdd: sku.priceInclTax,
						},
					});
					slotsConsumed++;
					reorderedCount++;
				}
			}

			// Touch cart
			await tx.cart.update({
				where: { id: cart.id },
				data: { updatedAt: new Date() },
			});
		});

		// Cache invalidation
		const tags = getCartInvalidationTags(userId, sessionId ?? undefined);
		tags.forEach((tag) => updateTag(tag));
		const productIds = new Set(eligibleItems.map((item) => item.sku.product.id));
		productIds.forEach((pid) => updateTag(CART_CACHE_TAGS.PRODUCT_CARTS(pid)));

		// Add skipped (not in eligibleItems) to skip count for user feedback
		skippedCount += order.items.length - eligibleItems.length;

		if (reorderedCount === 0) {
			return error(CART_ERROR_MESSAGES.GENERAL_ERROR);
		}

		const parts = [
			`${reorderedCount} article${reorderedCount > 1 ? "s" : ""} ajouté${reorderedCount > 1 ? "s" : ""} au panier`,
		];
		if (skippedCount > 0) parts.push(`${skippedCount} indisponible${skippedCount > 1 ? "s" : ""}`);
		if (truncatedCount > 0)
			parts.push(`${truncatedCount} non ajouté${truncatedCount > 1 ? "s" : ""} (panier plein)`);

		return success(parts.join(" · "), {
			reorderedCount,
			skippedCount,
			truncatedCount,
		});
	} catch (e) {
		return handleActionError(e, "Impossible de recommander cette commande");
	}
}
