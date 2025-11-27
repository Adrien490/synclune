"use server";

import { getSession } from "@/shared/utils/get-session";
import { updateTag } from "next/cache";
import { prisma } from "@/shared/lib/prisma";
import { getCartInvalidationTags } from "@/modules/cart/constants/cache";
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
		const cart = await prisma.cart.findFirst({
			where: userId ? { userId } : { sessionId },
			include: {
				items: {
					include: {
						sku: {
							include: {
								product: {
									select: {
										id: true,
										title: true,
										status: true,
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

		// 3. Identifier les items indisponibles
		const unavailableItems = cart.items.filter((item) => {
			const isOutOfStock = item.sku.inventory < item.quantity;
			const isInactive = !item.sku.isActive;
			const isNotPublic = item.sku.product.status !== "PUBLIC";

			return isOutOfStock || isInactive || isNotPublic;
		});

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

		// 6. Success - Return ActionState format
		return {
			status: ActionStatus.SUCCESS,
			message: `${result.count} article${result.count > 1 ? "s" : ""} indisponible${result.count > 1 ? "s" : ""} retiré${result.count > 1 ? "s" : ""}`,
			data: { deletedCount: result.count },
		};
	} catch (e) {
		// Error handling
		// console.error("[REMOVE_UNAVAILABLE_ITEMS] Error:", e);
		if (e instanceof Error) {
			// console.error("[REMOVE_UNAVAILABLE_ITEMS] Error message:", e.message);
			// console.error("[REMOVE_UNAVAILABLE_ITEMS] Error stack:", e.stack);
		}

		return {
			status: ActionStatus.ERROR,
			message:
				e instanceof Error
					? e.message
					: "Une erreur est survenue lors de la suppression des articles indisponibles",
		};
	}
}
