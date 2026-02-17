"use server";

import { updateTag } from "next/cache";
import { prisma } from "@/shared/lib/prisma";
import { getCartInvalidationTags, CART_CACHE_TAGS } from "@/modules/cart/constants/cache";
import { handleActionError, success, error } from "@/shared/lib/actions";
import { ActionStatus } from "@/shared/types/server-action";
import { batchValidateSkusForMerge } from "@/modules/cart/services/sku-validation.service";
import { CART_LIMITS } from "@/shared/lib/rate-limit-config";
import { MAX_CART_ITEMS } from "@/modules/cart/constants/cart";
import { getSession } from "@/modules/auth/lib/get-current-session";
import { checkMergeCartsRateLimit } from "@/modules/cart/lib/cart-rate-limit";
import type { MergeCartsResult } from "../types/cart.types";
import { getGuestCartForMerge, getUserCartForMerge } from "@/modules/cart/data/get-cart-for-merge";

// Re-export pour retrocompatibilite
export type { MergeCartsResult } from "../types/cart.types";

/**
 * Fusionne le panier visiteur avec le panier utilisateur après connexion
 *
 * Appelée par le hook Better Auth lors de la connexion.
 * Le hook gère les cookies, cette fonction gère la logique métier.
 *
 * Stratégie de fusion : MAX (quantité maximale entre les deux paniers)
 * - Évite les quantités excessives (ajouts accidentels multi-appareils)
 * - Adapté pour bijouterie artisanale avec stock limité
 *
 * Note: La validation stock est faite avant la transaction. En cas de
 * concurrence extrême, le checkout final vérifiera à nouveau le stock.
 *
 * @param userId ID de l'utilisateur connecté
 * @param sessionId SessionId du panier visiteur à fusionner
 */
export async function mergeCarts(
	userId: string,
	sessionId: string
): Promise<MergeCartsResult> {
	try {
		// 0a. Vérification de sécurité: le userId doit correspondre à l'utilisateur connecté
		// Empêche un attaquant de fusionner le panier d'un autre utilisateur
		const currentSession = await getSession();
		if (!currentSession?.user?.id || currentSession.user.id !== userId) {
			return {
				status: ActionStatus.ERROR,
				message: "Non autorisé",
			};
		}

		// 0b. Rate limiting uniforme avec les autres actions cart
		const rateLimitResult = await checkMergeCartsRateLimit(userId, sessionId, CART_LIMITS.MERGE);
		if (!rateLimitResult.success) {
			return {
				status: ActionStatus.ERROR,
				message: rateLimitResult.errorState.message,
			};
		}

		// 0c. Vérifier que l'utilisateur existe (protection contre appels directs)
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: { id: true, deletedAt: true },
		});

		if (!user || user.deletedAt) {
			return {
				status: ActionStatus.ERROR,
				message: "Utilisateur non trouvé",
			};
		}

		// 1. Récupérer les deux paniers (via data/)
		const [guestCart, userCart] = await Promise.all([
			getGuestCartForMerge(sessionId),
			getUserCartForMerge(userId),
		]);

		// 2. Si pas de panier visiteur, rien à faire
		if (!guestCart || guestCart.items.length === 0) {
			if (guestCart) {
				await prisma.cart.delete({ where: { id: guestCart.id } });
			}
			return {
				status: ActionStatus.SUCCESS,
				message: "Aucun article à fusionner",
				data: { mergedItems: 0, conflicts: 0 },
			};
		}

		// 3. Créer le panier utilisateur s'il n'existe pas
		let targetCart = userCart;
		if (!targetCart) {
			targetCart = await prisma.cart.create({
				data: {
					userId,
					expiresAt: null, // Pas d'expiration pour utilisateur
				},
				include: {
					items: true,
				},
			});
		}

		// 4. Préparer et valider tous les SKUs en batch (UNE SEULE requête DB)
		// Calculer les quantités finales selon la stratégie MAX
		const itemsToValidate: Array<{ skuId: string; quantity: number }> = [];
		const userItemsMap = new Map(
			targetCart.items.map((item) => [item.skuId, item])
		);

		for (const guestItem of guestCart.items) {
			// Skip les produits inactifs (déjà chargé dans guestCart.items)
			if (
				!guestItem.sku.isActive ||
				guestItem.sku.product.status !== "PUBLIC"
			) {
				continue;
			}

			const existingItem = userItemsMap.get(guestItem.skuId);
			const finalQuantity = existingItem
				? Math.max(existingItem.quantity, guestItem.quantity) // Stratégie MAX
				: guestItem.quantity;

			itemsToValidate.push({ skuId: guestItem.skuId, quantity: finalQuantity });
		}

		// Enforce MAX_CART_ITEMS: truncate new items if merge would exceed limit
		const existingUserItemCount = targetCart.items.length;
		const newItemSkuIds = itemsToValidate
			.filter((item) => !userItemsMap.has(item.skuId))
			.map((item) => item.skuId);
		const projectedTotal = existingUserItemCount + newItemSkuIds.length;

		if (projectedTotal > MAX_CART_ITEMS) {
			const availableSlots = Math.max(0, MAX_CART_ITEMS - existingUserItemCount);
			const allowedNewSkuIds = new Set(newItemSkuIds.slice(0, availableSlots));
			const allowedSkuIds = new Set([
				...itemsToValidate.filter((i) => userItemsMap.has(i.skuId)).map((i) => i.skuId),
				...allowedNewSkuIds,
			]);
			for (let i = itemsToValidate.length - 1; i >= 0; i--) {
				if (!allowedSkuIds.has(itemsToValidate[i].skuId)) {
					itemsToValidate.splice(i, 1);
				}
			}
		}

		// Build set of SKUs that survived truncation for filtering in transaction
		const validatedSkuIds = new Set(itemsToValidate.map((i) => i.skuId));

		// Validation batch - UNE SEULE requête pour tous les SKUs
		const validationResults = await batchValidateSkusForMerge(itemsToValidate);

		// 5. Fusionner les items dans une transaction atomique
		let mergedCount = 0;
		let conflictCount = 0;

		await prisma.$transaction(async (tx) => {
			for (const guestItem of guestCart.items) {
				// Skip inactive products or items truncated by MAX_CART_ITEMS
				if (
					!guestItem.sku.isActive ||
					guestItem.sku.product.status !== "PUBLIC" ||
					!validatedSkuIds.has(guestItem.skuId)
				) {
					continue;
				}

				const validation = validationResults.get(guestItem.skuId);
				if (!validation?.isValid) {
					continue; // Stock insuffisant ou SKU invalide
				}

				const existingItem = userItemsMap.get(guestItem.skuId);

				if (existingItem) {
					// Stratégie MAX : garde la quantité la plus élevée
					const maxQuantity = Math.max(
						existingItem.quantity,
						guestItem.quantity
					);

					await tx.cartItem.update({
						where: { id: existingItem.id },
						data: { quantity: maxQuantity },
					});
					conflictCount++;
				} else {
					// Pas de conflit : ajouter directement
					await tx.cartItem.create({
						data: {
							cartId: targetCart.id,
							skuId: guestItem.skuId,
							quantity: guestItem.quantity,
							priceAtAdd: guestItem.priceAtAdd, // Conserver le prix snapshot lors du merge
						},
					});
					mergedCount++;
				}
			}

			// 6. Supprimer le panier visiteur (dans la même transaction)
			await tx.cart.delete({ where: { id: guestCart.id } });
		});

		// 7. Invalider les caches
		const guestTags = getCartInvalidationTags(undefined, sessionId);
		const userTags = getCartInvalidationTags(userId, undefined);
		[...guestTags, ...userTags].forEach(tag => updateTag(tag));

		// 8. Invalider le cache des compteurs de paniers pour les produits du guest cart
		const productIds = new Set(
			guestCart.items
				.filter(item => item.sku.isActive && item.sku.product.status === "PUBLIC")
				.map(item => item.sku.product.id)
		);
		productIds.forEach(productId => {
			updateTag(CART_CACHE_TAGS.PRODUCT_CARTS(productId));
		});

		return {
			status: ActionStatus.SUCCESS,
			message: "Paniers fusionnés avec succès",
			data: {
				mergedItems: mergedCount,
				conflicts: conflictCount,
			},
		};
	} catch (error) {
		console.error("[MERGE_CARTS]", { userId, sessionId, error });
		return {
			status: ActionStatus.ERROR,
			message: "Une erreur est survenue lors de la fusion des paniers",
		};
	}
}
