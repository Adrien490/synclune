"use server";

import { ActionStatus, type ActionState } from "@/shared/types/server-action";
import { handleActionError } from "@/shared/lib/actions";
import { formatEuro } from "@/shared/utils/format-euro";
import { writeCartCookie } from "@/modules/cart/lib/cart-cookie";
import { checkCartRateLimit } from "@/modules/cart/lib/cart-rate-limit";
import { readCartWithSkus } from "@/modules/cart/services/read-cart-with-skus.service";
import { CART_LIMITS } from "@/shared/lib/rate-limit-config";
import { detectPriceChanges } from "../services/cart-pricing-calculator.service";

/**
 * Met à jour les prix témoins (priceAtAdd) de tous les articles du panier
 * au prix actuel (sku.priceInclTax)
 *
 * Cas d'usage : L'utilisateur voit que des prix ont baissé et souhaite
 * bénéficier des nouveaux prix au lieu des prix témoins.
 *
 * @returns ActionState avec nombre d'articles mis à jour
 */
export async function updateCartPrices(
	_?: ActionState,
	__formData?: FormData,
): Promise<ActionState> {
	try {
		// 1. Rate limiting
		const rateLimitResult = await checkCartRateLimit(CART_LIMITS.UPDATE);
		if (!rateLimitResult.success) {
			return rateLimitResult.errorState;
		}

		// 2. Lecture directe (sans cache de rendu) pour des prix frais
		const { cookie, items } = await readCartWithSkus();

		if (items.length === 0) {
			return {
				status: ActionStatus.ERROR,
				message: "Panier vide",
			};
		}

		// 3. Identifier les items où le prix a changé (exclure les indisponibles)
		const itemsToUpdate = items.filter(
			(item) =>
				item.priceAtAdd !== item.sku.priceInclTax &&
				item.sku.isActive &&
				!item.sku.deletedAt &&
				item.sku.product.status === "PUBLIC" &&
				!item.sku.product.deletedAt,
		);

		if (itemsToUpdate.length === 0) {
			return {
				status: ActionStatus.SUCCESS,
				message: "Aucun prix à mettre à jour",
				data: {
					updatedCount: 0,
					increased: [],
					decreased: [],
					totalSavings: 0,
					totalIncrease: 0,
				},
			};
		}

		// 4. Calculer les changements (hausse/baisse) AVANT l'update (UI feedback)
		const priceChanges = detectPriceChanges(itemsToUpdate);
		const increased = priceChanges.itemsWithPriceIncrease.map((item) => ({
			cartItemId: item.id,
			productTitle: item.sku.product.title,
			oldPrice: item.priceAtAdd,
			newPrice: item.sku.priceInclTax,
			delta: (item.sku.priceInclTax - item.priceAtAdd) * item.quantity,
		}));
		const decreased = priceChanges.itemsWithPriceDecrease.map((item) => ({
			cartItemId: item.id,
			productTitle: item.sku.product.title,
			oldPrice: item.priceAtAdd,
			newPrice: item.sku.priceInclTax,
			delta: (item.priceAtAdd - item.sku.priceInclTax) * item.quantity,
		}));

		// 5. Réécriture du cookie avec les prix frais.
		// Les lignes non concernées (indisponibles, prix inchangé) sont conservées
		// telles quelles — ce n'est pas le rôle de cette action de les retirer.
		const freshPriceBySkuId = new Map(
			itemsToUpdate.map((item) => [item.skuId, item.sku.priceInclTax]),
		);
		await writeCartCookie({
			...cookie,
			items: cookie.items.map((item) => {
				const freshPrice = freshPriceBySkuId.get(item.skuId);
				return freshPrice === undefined ? item : { ...item, priceAtAdd: freshPrice };
			}),
		});

		// 6. Message user (hausse = avertissement, baisse = économie)
		const count = itemsToUpdate.length;
		let message: string;
		if (increased.length > 0 && decreased.length > 0) {
			message = `Prix mis à jour (${increased.length} hausse${increased.length > 1 ? "s" : ""}, ${decreased.length} baisse${decreased.length > 1 ? "s" : ""})`;
		} else if (increased.length > 0) {
			message = `${count} prix en hausse (+${formatEuro(priceChanges.totalIncrease)}). Vérifie ton panier.`;
		} else {
			message = `Bonne nouvelle : ${count} prix en baisse (-${formatEuro(priceChanges.totalSavings)})`;
		}

		return {
			status: ActionStatus.SUCCESS,
			message,
			data: {
				updatedCount: count,
				increased,
				decreased,
				totalSavings: priceChanges.totalSavings,
				totalIncrease: priceChanges.totalIncrease,
			},
		};
	} catch (e) {
		return handleActionError(e, "Erreur lors de la mise a jour des prix");
	}
}
