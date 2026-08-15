"use server";

import { ActionStatus, type ActionState } from "@/shared/types/server-action";
import { handleActionError } from "@/shared/lib/actions";
import { formatEuro } from "@/shared/utils/format-euro";
import { writeCartCookie } from "@/modules/cart/lib/cart-cookie";
import { readCartWithVariants } from "@/modules/cart/services/read-cart-with-variants.service";
import { detectPriceChanges } from "../services/cart-pricing-calculator.service";

/**
 * Met à jour les prix témoins (priceAtAdd) de tous les articles du panier
 * au prix actuel (variant.priceCents)
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
		// 2. Lecture directe (sans cache de rendu) pour des prix frais
		const { cookie, items } = await readCartWithVariants();

		if (items.length === 0) {
			return {
				status: ActionStatus.ERROR,
				message: "Panier vide",
			};
		}

		// 3. Identifier les items où le prix a changé (exclure les indisponibles)
		const itemsToUpdate = items.filter(
			(item) =>
				item.priceAtAdd !== (item.variant.priceCents ?? item.variant.product.priceCents) &&
				item.variant.active &&
				item.variant.product.active,
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
		const increased = priceChanges.itemsWithPriceIncrease.map((item) => {
			const newPrice = item.variant.priceCents ?? item.variant.product.priceCents;
			return {
				cartItemId: item.id,
				productTitle: item.variant.product.name,
				oldPrice: item.priceAtAdd,
				newPrice,
				delta: (newPrice - item.priceAtAdd) * item.quantity,
			};
		});
		const decreased = priceChanges.itemsWithPriceDecrease.map((item) => {
			const newPrice = item.variant.priceCents ?? item.variant.product.priceCents;
			return {
				cartItemId: item.id,
				productTitle: item.variant.product.name,
				oldPrice: item.priceAtAdd,
				newPrice,
				delta: (item.priceAtAdd - newPrice) * item.quantity,
			};
		});

		// 5. Réécriture du cookie avec les prix frais.
		// Les lignes non concernées (indisponibles, prix inchangé) sont conservées
		// telles quelles — ce n'est pas le rôle de cette action de les retirer.
		const freshPriceByVariantId = new Map(
			itemsToUpdate.map((item) => [
				item.variantId,
				item.variant.priceCents ?? item.variant.product.priceCents,
			]),
		);
		await writeCartCookie({
			...cookie,
			items: cookie.items.map((item) => {
				const freshPrice = freshPriceByVariantId.get(item.variantId);
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
		return handleActionError(e, "Erreur lors de la mise à jour des prix");
	}
}
