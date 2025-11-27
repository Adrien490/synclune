"use server";

import { updateTag } from "next/cache";
import { prisma } from "@/shared/lib/prisma";
import { getCartInvalidationTags } from "@/modules/cart/constants/cache";
import { ActionStatus, type ActionState } from "@/shared/types/server-action";
import { getSession } from "@/shared/utils/get-session";
import { getCartSessionId } from "@/modules/cart/lib/cart-session";

/**
 * Met à jour les prix snapshot (priceAtAdd) de tous les articles du panier
 * au prix actuel (sku.priceInclTax)
 *
 * Cas d'usage : L'utilisateur voit que des prix ont baissé et souhaite
 * bénéficier des nouveaux prix au lieu des prix snapshot.
 *
 * @returns ActionState avec nombre d'articles mis à jour
 */
export async function updateCartPrices(
	_?: ActionState,
	__formData?: FormData
): Promise<ActionState> {
	try {
		// 1. Identifier le panier (utilisateur ou session)
		const session = await getSession();
		const userId = session?.user?.id;
		const sessionId = !userId ? await getCartSessionId() : null;

		if (!userId && !sessionId) {
			return {
				status: ActionStatus.ERROR,
				message: "Aucun panier trouvé",
			};
		}

		// 2. Récupérer le panier avec ses items
		const cart = await prisma.cart.findFirst({
			where: userId ? { userId } : { sessionId: sessionId! },
			include: {
				items: {
					include: {
						sku: {
							select: {
								id: true,
								priceInclTax: true,
								isActive: true,
								product: {
									select: {
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
				status: ActionStatus.ERROR,
				message: "Panier vide",
			};
		}

		// 3. Identifier les items où le prix a changé
		const itemsToUpdate = cart.items.filter(
			(item) =>
				item.priceAtAdd !== item.sku.priceInclTax &&
				item.sku.isActive &&
				item.sku.product.status === "PUBLIC"
		);

		if (itemsToUpdate.length === 0) {
			return {
				status: ActionStatus.SUCCESS,
				message: "Aucun prix à mettre à jour",
				data: { updatedCount: 0 },
			};
		}

		// 4. Mettre à jour les prix dans une transaction
		await prisma.$transaction(
			itemsToUpdate.map((item) =>
				prisma.cartItem.update({
					where: { id: item.id },
					data: {
						priceAtAdd: item.sku.priceInclTax,
					},
				})
			)
		);

		// 5. Invalider le cache
		const tags = getCartInvalidationTags(userId, sessionId || undefined);
		tags.forEach(tag => updateTag(tag));

		return {
			status: ActionStatus.SUCCESS,
			message: `Prix mis à jour pour ${itemsToUpdate.length} article${itemsToUpdate.length > 1 ? "s" : ""}`,
			data: {
				updatedCount: itemsToUpdate.length,
			},
		};
	} catch (error) {
// console.error("[UPDATE_CART_PRICES] Error:", error);
		return {
			status: ActionStatus.ERROR,
			message: "Erreur lors de la mise à jour des prix",
		};
	}
}
