"use server";

import { updateTag } from "next/cache";
import { prisma } from "@/shared/lib/prisma";
import { getCartInvalidationTags } from "@/modules/cart/constants/cache";
import { ActionStatus } from "@/shared/types/server-action";
import { batchValidateSkusForMerge } from "@/modules/cart/lib/sku-validation";
import { checkRateLimit, getClientIp, getRateLimitIdentifier } from "@/shared/lib/rate-limit";
import { CART_LIMITS } from "@/shared/lib/rate-limit-config";
import { headers } from "next/headers";
import { getSession } from "@/modules/auth/lib/get-current-session";

export type MergeCartsResult =
	| {
			status: typeof ActionStatus.SUCCESS;
			message: string;
			data: {
				mergedItems: number;
				conflicts: number;
			};
	  }
	| {
			status: typeof ActionStatus.ERROR;
			message: string;
	  };

/**
 * Fusionne le panier visiteur avec le panier utilisateur après connexion
 *
 * 🔄 ARCHITECTURE (Next.js 16 + React 19.2 compatible)
 * ------------------------------------------------
 * Cette fonction est appelée EXCLUSIVEMENT par le hook Better Auth lors de la connexion.
 * Elle ne gère PAS les cookies - c'est la responsabilité du hook appelant.
 *
 * Séparation des responsabilités :
 * - Hook Better Auth : Récupère et supprime les cookies via ctx.getCookie()/ctx.setCookie()
 * - mergeCarts : Gère uniquement la logique métier du merge en base de données
 *
 * Stratégie de fusion :
 * - Pour chaque item du panier visiteur :
 *   - Si le SKU n'existe pas dans le panier utilisateur : ajouter
 *   - Si le SKU existe déjà : prendre la quantité MAXIMALE
 *   - Vérifier le stock avant toute fusion
 * - Supprimer le panier visiteur après fusion
 *
 * ⚠️ NOTE IMPORTANTE - Stratégie de fusion MAX vs SUM :
 *
 * STRATÉGIE ACTUELLE : MAX (quantité maximale)
 * ------------------------------------------------
 * Comportement : Garde la quantité la plus élevée entre les deux paniers
 * Exemple concret :
 *   - Panier utilisateur (mobile connecté) : Collier OR × 3
 *   - Panier visiteur (desktop non connecté) : Collier OR × 1
 *   - Résultat après connexion : Collier OR × 3 (MAX(3, 1))
 *
 * Avantages :
 *   ✓ Évite les quantités excessives si ajout accidentel sur plusieurs appareils
 *   ✓ Préserve l'intention principale de l'utilisateur (quantité max choisie)
 *   ✓ Réduit risque de rupture stock lors du checkout
 *
 * Inconvénients :
 *   ✗ L'utilisateur peut perdre des articles ajoutés sur un autre appareil
 *   ✗ Moins intuitif si l'utilisateur veut vraiment cumuler les quantités
 *
 * ALTERNATIVE POSSIBLE : SUM (addition des quantités)
 * ------------------------------------------------
 * Comportement : Additionne les quantités des deux paniers
 * Exemple concret :
 *   - Panier utilisateur : Collier OR × 3
 *   - Panier visiteur : Collier OR × 2
 *   - Résultat après connexion : Collier OR × 5 (3 + 2)
 *
 * Avantages :
 *   ✓ Plus intuitif : "tout ce que j'ai ajouté est conservé"
 *   ✓ Aucune perte d'articles ajoutés
 *
 * Inconvénients :
 *   ✗ Peut créer des quantités excessives non désirées
 *   ✗ Risque accru de rupture stock au checkout
 *
 * RECOMMANDATION MÉTIER :
 * Pour une bijouterie artisanale avec stock limité, la stratégie MAX est recommandée.
 * Si vous souhaitez passer à SUM, décommenter le code alternatif ci-dessous (ligne ~170).
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

		// 0b. Rate limiting uniforme avec les autres actions cart (avec IP fallback)
		const headersList = await headers();
		const ipAddress = await getClientIp(headersList);
		const rateLimitId = getRateLimitIdentifier(userId, sessionId, ipAddress);
		const rateLimit = checkRateLimit(rateLimitId, CART_LIMITS.MERGE);

		if (!rateLimit.success) {
			return {
				status: ActionStatus.ERROR,
				message: "Trop de requêtes. Veuillez réessayer plus tard.",
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

		// 1. Récupérer les deux paniers
		const [guestCart, userCart] = await Promise.all([
			prisma.cart.findUnique({
				where: { sessionId },
				include: {
					items: {
						include: {
							sku: {
								select: {
									id: true,
									inventory: true,
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
			}),
			prisma.cart.findUnique({
				where: { userId },
				include: {
					items: true,
				},
			}),
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

		// Validation batch - UNE SEULE requête pour tous les SKUs
		const validationResults = await batchValidateSkusForMerge(itemsToValidate);

		// 5. Fusionner les items dans une transaction atomique
		let mergedCount = 0;
		let conflictCount = 0;

		await prisma.$transaction(async (tx) => {
			for (const guestItem of guestCart.items) {
				// Skip les produits inactifs
				if (
					!guestItem.sku.isActive ||
					guestItem.sku.product.status !== "PUBLIC"
				) {
					continue;
				}

				const validation = validationResults.get(guestItem.skuId);
				if (!validation?.isValid) {
					continue; // Stock insuffisant ou SKU invalide
				}

				const existingItem = userItemsMap.get(guestItem.skuId);

				if (existingItem) {
					// 🔀 STRATÉGIE DE FUSION : MAX (voir documentation ligne 34-71)
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

		return {
			status: ActionStatus.SUCCESS,
			message: "Paniers fusionnés avec succès",
			data: {
				mergedItems: mergedCount,
				conflicts: conflictCount,
			},
		};
	} catch (error) {
		return {
			status: ActionStatus.ERROR,
			message: "Une erreur est survenue lors de la fusion des paniers",
		};
	}
}
