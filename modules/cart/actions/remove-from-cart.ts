"use server";

import { updateTag } from "next/cache";
import { handleActionError } from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import { getCartInvalidationTags, CART_CACHE_TAGS } from "@/modules/cart/constants/cache";
import { CART_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { checkCartRateLimit } from "@/modules/cart/lib/cart-rate-limit";
import { removeFromCartSchema } from "../schemas/cart.schemas";

/**
 * Server Action pour supprimer un article du panier
 * Compatible with useActionState de React 19
 *
 * Rate limiting configuré via CART_LIMITS.REMOVE
 */
export async function removeFromCart(
	_: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Rate limiting + récupération contexte
		const rateLimitResult = await checkCartRateLimit(CART_LIMITS.REMOVE);
		if (!rateLimitResult.success) {
			return rateLimitResult.errorState;
		}
		const { userId, sessionId } = rateLimitResult.context;

		// 2. Extraction des données du FormData
		const rawData = {
			cartItemId: formData.get("cartItemId") as string,
		};

		// 3. Validation avec Zod
		const result = removeFromCartSchema.safeParse(rawData);
		if (!result.success) {
			const firstError = result.error.issues[0];
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: firstError?.message || "Données invalides",
			};
		}

		const validatedData = result.data;

		// 4. Récupérer l'item avec son panier et le productId du SKU
		const cartItem = await prisma.cartItem.findUnique({
			where: { id: validatedData.cartItemId },
			include: {
				cart: true,
				sku: {
					select: { productId: true },
				},
			},
		});

		if (!cartItem) {
			return { status: ActionStatus.ERROR, message: "Article introuvable dans le panier" };
		}

		// 5. Vérifier l'appartenance du panier

		const isOwner = userId
			? cartItem.cart.userId === userId
			: cartItem.cart.sessionId === sessionId;

		if (!isOwner) {
			return { status: ActionStatus.ERROR, message: "Accès non autorisé" };
		}

		// 6. Supprimer l'item du panier
		await prisma.$transaction(async (tx) => {
			await tx.cartItem.delete({
				where: { id: validatedData.cartItemId },
			});

			await tx.cart.update({
				where: { id: cartItem.cartId },
				data: {
					updatedAt: new Date(),
				},
			});
		});

		// 7. Invalider le cache
		const tags = getCartInvalidationTags(userId, sessionId || undefined);
		tags.forEach(tag => updateTag(tag));

		// 8. Invalider le cache du compteur de paniers pour ce produit (FOMO "dans X paniers")
		updateTag(CART_CACHE_TAGS.PRODUCT_CARTS(cartItem.sku.productId));

		// 9. Success - Return ActionState format
		return {
			status: ActionStatus.SUCCESS,
			message: "Article supprimé du panier",
		};
	} catch (e) {
		return handleActionError(e, "Impossible de supprimer l'article du panier");
	}
}
