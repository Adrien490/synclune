"use server";

import { updateTag } from "next/cache";
import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { getCartInvalidationTags } from "@/modules/cart/constants/cache";
import { ActionStatus, type ActionState } from "@/shared/types/server-action";
import { handleActionError } from "@/shared/lib/actions";
import { checkCartRateLimit } from "@/modules/cart/lib/cart-rate-limit";
import { CART_LIMITS } from "@/shared/lib/rate-limit-config";
import { detectPriceChanges } from "../services/cart-pricing-calculator.service";

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
	__formData?: FormData,
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

		// 2. Direct DB read (bypasses cache for fresh prices)
		const cart = await prisma.cart.findFirst({
			where: {
				...(userId ? { userId } : { sessionId: sessionId! }),
				OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
			},
			select: {
				id: true,
				items: {
					select: {
						id: true,
						priceAtAdd: true,
						quantity: true,
						sku: {
							select: {
								priceInclTax: true,
								isActive: true,
								deletedAt: true,
								product: {
									select: {
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

		// 5. Batch update prices in a single query (CASE/WHEN)
		const caseFragments = itemsToUpdate.map(
			(item) => Prisma.sql`WHEN id = ${item.id} THEN ${item.sku.priceInclTax}`,
		);
		const idFragments = itemsToUpdate.map((item) => Prisma.sql`${item.id}`);
		await prisma.$executeRaw`UPDATE "CartItem" SET "priceAtAdd" = CASE ${Prisma.join(caseFragments, " ")} END, "updatedAt" = NOW() WHERE id IN (${Prisma.join(idFragments)})`;

		// 6. Invalider le cache
		const tags = getCartInvalidationTags(userId, sessionId ?? undefined);
		tags.forEach((tag) => updateTag(tag));

		// 7. Message user (hausse = avertissement, baisse = économie)
		const count = itemsToUpdate.length;
		let message: string;
		if (increased.length > 0 && decreased.length > 0) {
			message = `Prix mis à jour (${increased.length} hausse${increased.length > 1 ? "s" : ""}, ${decreased.length} baisse${decreased.length > 1 ? "s" : ""})`;
		} else if (increased.length > 0) {
			const formatted = (priceChanges.totalIncrease / 100).toFixed(2).replace(".", ",");
			message = `${count} prix en hausse (+${formatted} €). Vérifiez votre panier.`;
		} else {
			const formatted = (priceChanges.totalSavings / 100).toFixed(2).replace(".", ",");
			message = `Bonne nouvelle : ${count} prix en baisse (-${formatted} €)`;
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
