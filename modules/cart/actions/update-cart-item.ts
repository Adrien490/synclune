"use server";

import { updateTag } from "next/cache";
import { prisma } from "@/shared/lib/prisma";
import { getCartInvalidationTags } from "@/modules/cart/constants/cache";
import { CART_LIMITS } from "@/shared/lib/rate-limit-config";
import { validateInput, handleActionError, success, error, BusinessError } from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
import { getCartExpirationDate } from "@/modules/cart/lib/cart-session";
import { checkCartRateLimit } from "@/modules/cart/lib/cart-rate-limit";
import { updateCartItemSchema } from "../schemas/cart.schemas";
import { CART_ERROR_MESSAGES } from "../constants/error-messages";
import { MAX_QUANTITY_PER_ORDER } from "../constants/cart";

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
		const validated = validateInput(updateCartItemSchema, rawData);
		if ("error" in validated) return validated.error;

		const validatedData = validated.data;

		// 4. Récupérer l'item avec son panier (no need to include sku — FOR UPDATE fetches fresh data)
		const cartItem = await prisma.cartItem.findUnique({
			where: { id: validatedData.cartItemId },
			include: {
				cart: true,
			},
		});

		if (!cartItem) {
			return error("Article introuvable dans le panier");
		}

		// 5. Vérifier l'appartenance du panier
		const isOwner = userId
			? cartItem.cart.userId === userId
			: cartItem.cart.sessionId === sessionId;

		if (!isOwner) {
			return error("Acces non autorise");
		}

		// 6. Si la quantité n'a pas changé, ne rien faire
		if (validatedData.quantity === cartItem.quantity) {
			return success(`Quantité mise à jour (${validatedData.quantity})`);
		}

		// 7. Transaction: Mettre à jour l'item et le panier
		await prisma.$transaction(async (tx) => {
			// 7a. Verrouiller le SKU avec FOR UPDATE pour éviter les race conditions sur le stock
			const skuRows = await tx.$queryRaw<Array<{
				inventory: number;
				isActive: boolean;
				deletedAt: Date | null;
				productStatus: string;
				productDeletedAt: Date | null;
			}>>`
				SELECT s.inventory, s."isActive", s."deletedAt",
					p.status AS "productStatus", p."deletedAt" AS "productDeletedAt"
				FROM "ProductSku" s
				JOIN "Product" p ON p.id = s."productId"
				WHERE s.id = ${cartItem.skuId}
				FOR UPDATE OF s
			`;

			const sku = skuRows[0];
			if (!sku || !sku.isActive || sku.deletedAt) {
				throw new BusinessError(CART_ERROR_MESSAGES.SKU_INACTIVE);
			}

			if (sku.productDeletedAt || sku.productStatus !== "PUBLIC") {
				throw new BusinessError(CART_ERROR_MESSAGES.PRODUCT_NOT_PUBLIC);
			}

			// 7b. Defense-in-depth: enforce max quantity inside the transaction
			if (validatedData.quantity > MAX_QUANTITY_PER_ORDER) {
				throw new BusinessError(CART_ERROR_MESSAGES.QUANTITY_MAX);
			}

			// 7c. Si augmentation de quantité, vérifier le stock disponible
			if (validatedData.quantity > sku.inventory) {
				throw new BusinessError(
					CART_ERROR_MESSAGES.INSUFFICIENT_STOCK(sku.inventory)
				);
			}

			// 7d. Mettre à jour le CartItem
			await tx.cartItem.update({
				where: { id: validatedData.cartItemId },
				data: { quantity: validatedData.quantity },
			});

			// 7e. Mettre à jour le panier
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
		return success(`Quantité mise à jour (${validatedData.quantity})`);
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors de la mise à jour");
	}
}
