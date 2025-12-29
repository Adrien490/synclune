"use server";

import { getSession } from "@/modules/auth/lib/get-current-session";
import { updateTag } from "next/cache";
import { prisma } from "@/shared/lib/prisma";
import { getCartInvalidationTags, CART_CACHE_TAGS } from "@/modules/cart/constants/cache";
import { filterUnavailableItems } from "@/modules/cart/services/item-availability.service";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { getCartSessionId } from "@/modules/cart/lib/cart-session";

/**
 * Server Action pour retirer tous les articles indisponibles du panier
 *
 * Un article est considéré comme indisponible si :
 * - Stock insuffisant (sku.inventory < quantity)
 * - SKU inactif (sku.isActive = false)
 * - Produit non public (product.status !== "PUBLIC")
 *
 * Compatible avec useActionState de React 19
 */
export async function removeUnavailableItems(
	_?: ActionState,
	__formData?: FormData
): Promise<ActionState> {
	try {
		// 1. Déterminer l'identifiant du panier (userId ou sessionId)
		const session = await getSession();
		const userId = session?.user?.id;
		const sessionId = !userId ? await getCartSessionId() : null;

		if (!userId && !sessionId) {
			return { status: ActionStatus.ERROR, message: "Aucun panier trouvé" };
		}

		// 2. Récupérer le panier avec tous ses items et relations
		// ⚠️ AUDIT FIX: Utiliser select explicite au lieu d'include + filtre deletedAt
		const cart = await prisma.cart.findFirst({
			where: userId ? { userId } : { sessionId },
			select: {
				id: true,
				items: {
					select: {
						id: true,
						skuId: true,
						quantity: true,
						sku: {
							select: {
								id: true,
								inventory: true,
								isActive: true,
								deletedAt: true,
								product: {
									select: {
										id: true,
										title: true,
										status: true,
										deletedAt: true,
									},
								},
							},
						},
					},
				},
			},
		});

		if (!cart || cart.items.length === 0) {
			return {
				status: ActionStatus.SUCCESS,
				message: "Aucun article à retirer",
				data: { deletedCount: 0 },
			};
		}

		// 3. Identifier les items indisponibles via le service
		const unavailableItems = filterUnavailableItems(cart.items);

		if (unavailableItems.length === 0) {
			return {
				status: ActionStatus.SUCCESS,
				message: "Aucun article indisponible",
				data: { deletedCount: 0 },
			};
		}

		// 4. Supprimer les items indisponibles
		const result = await prisma.cartItem.deleteMany({
			where: {
				id: {
					in: unavailableItems.map((item) => item.id),
				},
			},
		});

		// 5. Invalider le cache
		const tags = getCartInvalidationTags(userId, sessionId || undefined);
		tags.forEach(tag => updateTag(tag));

		// 5b. Invalider le cache des compteurs de paniers pour les produits supprimes
		const productIds = new Set(
			unavailableItems.map(item => item.sku.product.id)
		);
		productIds.forEach(productId => {
			updateTag(CART_CACHE_TAGS.PRODUCT_CARTS(productId));
		});

		// 6. Success - Return ActionState format
		return {
			status: ActionStatus.SUCCESS,
			message: `${result.count} article${result.count > 1 ? "s" : ""} indisponible${result.count > 1 ? "s" : ""} retiré${result.count > 1 ? "s" : ""}`,
			data: { deletedCount: result.count },
		};
	} catch (e) {
		return {
			status: ActionStatus.ERROR,
			message:
				e instanceof Error
					? e.message
					: "Une erreur est survenue lors de la suppression des articles indisponibles",
		};
	}
}
