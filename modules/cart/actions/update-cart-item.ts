"use server";

import { getSession } from "@/shared/utils/get-session";
import { updateTags } from "@/shared/lib/cache";
import { prisma } from "@/shared/lib/prisma";
import { getCartInvalidationTags } from "@/modules/cart/constants/cache";
import { checkRateLimit, getClientIp, getRateLimitIdentifier } from "@/shared/lib/rate-limit";
import { CART_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { headers } from "next/headers";
import {
	getCartExpirationDate,
	getCartSessionId,
} from "@/modules/cart/lib/cart-session";
import { updateCartItemSchema } from "../schemas/cart.schemas";

/**
 * Server Action pour mettre à jour la quantité d'un article dans le panier
 * Compatible avec useActionState de React 19
 *
 * Rate limiting configuré via CART_LIMITS.UPDATE
 */
export async function updateCartItem(
	_: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Rate limiting (protection anti-spam)
		const session = await getSession();
		const userId = session?.user?.id;
		const sessionId = !userId ? await getCartSessionId() : null;
		const headersList = await headers();
		const ipAddress = await getClientIp(headersList);

		const rateLimitId = getRateLimitIdentifier(userId, sessionId || null, ipAddress);
		const rateLimit = checkRateLimit(rateLimitId, CART_LIMITS.UPDATE);

		if (!rateLimit.success) {
			return {
				status: ActionStatus.ERROR,
				message: rateLimit.error || "Trop de requêtes. Veuillez réessayer plus tard.",
				data: {
					retryAfter: rateLimit.retryAfter,
					reset: rateLimit.reset,
				},
			};
		}

		// 2. Extraction des données du FormData
		const rawData = {
			cartItemId: formData.get("cartItemId") as string,
			quantity: Number(formData.get("quantity")) || 1,
		};

		// 3. Validation avec Zod
		const result = updateCartItemSchema.safeParse(rawData);
		if (!result.success) {
			const firstError = result.error.issues[0];
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: firstError?.message || "Données invalides",
			};
		}

		const validatedData = result.data;

		// 4. Récupérer l'item avec son panier
		const cartItem = await prisma.cartItem.findUnique({
			where: { id: validatedData.cartItemId },
			include: {
				cart: true,
				sku: true,
			},
		});

		if (!cartItem) {
			return {
				status: ActionStatus.ERROR,
				message: "Article introuvable dans le panier",
			};
		}

		// 5. Vérifier l'appartenance du panier
		const isOwner = userId
			? cartItem.cart.userId === userId
			: cartItem.cart.sessionId === sessionId;

		if (!isOwner) {
			return { status: ActionStatus.ERROR, message: "Accès non autorisé" };
		}

		// 6. Si la quantité n'a pas changé, ne rien faire
		if (validatedData.quantity === cartItem.quantity) {
			return {
				status: ActionStatus.SUCCESS,
				message: `Quantité mise à jour (${validatedData.quantity})`,
			};
		}

		// 7. Transaction: Mettre à jour l'item et le panier
		await prisma.$transaction(async (tx) => {
			// 7a. Vérifier le stock disponible
			const sku = await tx.productSku.findUnique({
				where: { id: cartItem.skuId },
				select: { inventory: true, isActive: true },
			});

			if (!sku || !sku.isActive) {
				throw new Error("Ce produit n'est plus disponible");
			}

			// 7b. Si augmentation de quantité, vérifier le stock disponible
			if (validatedData.quantity > sku.inventory) {
				throw new Error(
					`Stock insuffisant. Disponible : ${sku.inventory} exemplaire${sku.inventory > 1 ? "s" : ""}.`
				);
			}

			// 7c. Mettre à jour le CartItem
			await tx.cartItem.update({
				where: { id: validatedData.cartItemId },
				data: { quantity: validatedData.quantity },
			});

			// 7d. Mettre à jour le panier
			await tx.cart.update({
				where: { id: cartItem.cartId },
				data: {
					expiresAt: userId ? null : getCartExpirationDate(),
					updatedAt: new Date(),
				},
			});
		});

		// 8. Invalider le cache
		const tags = getCartInvalidationTags(userId, sessionId || undefined);
		updateTags(tags);

		// 9. Success - Return ActionState format
		return {
			status: ActionStatus.SUCCESS,
			message: `Quantité mise à jour (${validatedData.quantity})`,
		};
	} catch (e) {
		// Error handling
// console.error("[UPDATE_CART_ITEM] Error:", e);
		if (e instanceof Error) {
// console.error("[UPDATE_CART_ITEM] Error message:", e.message);
// console.error("[UPDATE_CART_ITEM] Error stack:", e.stack);
		}

		return {
			status: ActionStatus.ERROR,
			message: e instanceof Error ? e.message : "Une erreur est survenue lors de la mise à jour",
		};
	}
}
