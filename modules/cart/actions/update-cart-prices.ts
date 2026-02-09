"use server";

import { updateTag } from "next/cache";
import { prisma } from "@/shared/lib/prisma";
import { getCartInvalidationTags } from "@/modules/cart/constants/cache";
import { ActionStatus, type ActionState } from "@/shared/types/server-action";
import { getCartWithSkuPrices } from "@/modules/cart/data/get-cart-with-sku-prices";
import { handleActionError } from "@/shared/lib/actions";
import { checkCartRateLimit } from "@/modules/cart/lib/cart-rate-limit";
import { CART_LIMITS } from "@/shared/lib/rate-limit-config";

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
		// 1. Rate limiting + récupération contexte
		const rateLimitResult = await checkCartRateLimit(CART_LIMITS.UPDATE);
		if (!rateLimitResult.success) {
			return rateLimitResult.errorState;
		}
		const { userId, sessionId } = rateLimitResult.context;

		if (!userId && !sessionId) {
			return {
				status: ActionStatus.ERROR,
				message: "Aucun panier trouvé",
			};
		}

		// 2. Récupérer le panier avec ses items (via data/)
		const cart = await getCartWithSkuPrices(userId, sessionId || undefined);

		if (!cart || cart.items.length === 0) {
			return {
				status: ActionStatus.ERROR,
				message: "Panier vide",
			};
		}

		// 3. Identifier les items où le prix a changé (exclure les soft-deleted)
		const itemsToUpdate = cart.items.filter(
			(item) =>
				item.priceAtAdd !== item.sku.priceInclTax &&
				item.sku.isActive &&
				!item.sku.deletedAt &&
				item.sku.product.status === "PUBLIC" &&
				!item.sku.product.deletedAt
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
	} catch (e) {
		return handleActionError(e, "Erreur lors de la mise a jour des prix");
	}
}
