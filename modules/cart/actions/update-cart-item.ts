"use server";

import { updateTag } from "next/cache";
import { prisma } from "@/shared/lib/prisma";
import { getCartInvalidationTags } from "@/modules/cart/constants/cache";
import { CART_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { getCartExpirationDate } from "@/modules/cart/lib/cart-session";
import { checkCartRateLimit } from "@/modules/cart/lib/cart-rate-limit";
import { updateCartItemSchema } from "../schemas/cart.schemas";
import { handleActionError } from "@/shared/lib/actions";

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
		// 1. Rate limiting + récupération contexte
		const rateLimitResult = await checkCartRateLimit(CART_LIMITS.UPDATE);
		if (!rateLimitResult.success) {
			return rateLimitResult.errorState;
		}
		const { userId, sessionId } = rateLimitResult.context;

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
			// 7a. Verrouiller le SKU avec FOR UPDATE pour éviter les race conditions sur le stock
			const skuRows = await tx.$queryRaw<Array<{ inventory: number; isActive: boolean }>>`
				SELECT inventory, "isActive"
				FROM "ProductSku"
				WHERE id = ${cartItem.skuId}
				FOR UPDATE
			`;

			const sku = skuRows[0];
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
		tags.forEach(tag => updateTag(tag));

		// 9. Success - Return ActionState format
		return {
			status: ActionStatus.SUCCESS,
			message: `Quantité mise à jour (${validatedData.quantity})`,
		};
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors de la mise à jour");
	}
}
