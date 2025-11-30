"use server";

import { updateTag } from "next/cache";
import { prisma } from "@/shared/lib/prisma";
import { getCartInvalidationTags } from "@/modules/cart/constants/cache";
import { ActionStatus } from "@/shared/types/server-action";
import { validateSkuAndStock } from "@/modules/cart/lib/sku-validation";

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

		// 4. Fusionner les items dans une transaction atomique
		let mergedCount = 0;
		let conflictCount = 0;

		await prisma.$transaction(async (tx) => {
			for (const guestItem of guestCart.items) {
				// Vérifier que le SKU est toujours actif et disponible
				if (
					!guestItem.sku.isActive ||
					guestItem.sku.product.status !== "PUBLIC"
				) {
					continue; // Skip les produits inactifs
				}

				// Chercher si ce SKU existe déjà dans le panier utilisateur
				const existingItem = targetCart.items.find(
					(item) => item.skuId === guestItem.skuId
				);

				if (existingItem) {
					// 🔀 STRATÉGIE DE FUSION : MAX (voir documentation ligne 34-71)
					// Conflit : prendre la quantité maximale
					const maxQuantity = Math.max(
						existingItem.quantity,
						guestItem.quantity
					);

					// 💡 ALTERNATIVE SUM (décommenter pour activer) :
					// const sumQuantity = existingItem.quantity + guestItem.quantity;

					// Vérifier le stock
					const stockValidation = await validateSkuAndStock({
						skuId: guestItem.skuId,
						quantity: maxQuantity, // Remplacer par sumQuantity si stratégie SUM
					});

					if (stockValidation.success) {
						await tx.cartItem.update({
							where: { id: existingItem.id },
							data: {
								quantity: maxQuantity, // Remplacer par sumQuantity si stratégie SUM
							},
						});
						conflictCount++;
					}
					// Si stock insuffisant, on garde la quantité existante (aucune erreur affichée)
				} else {
					// Pas de conflit : ajouter directement
					// Vérifier le stock
					const stockValidation = await validateSkuAndStock({
						skuId: guestItem.skuId,
						quantity: guestItem.quantity,
					});

					if (stockValidation.success) {
						await tx.cartItem.create({
							data: {
								cartId: targetCart.id,
								skuId: guestItem.skuId,
								quantity: guestItem.quantity,
								priceAtAdd: guestItem.priceAtAdd, // 🔴 Conserver le prix snapshot lors du merge
							},
						});
						mergedCount++;
					}
				}
			}

			// 5. Supprimer le panier visiteur (dans la même transaction)
			await tx.cart.delete({ where: { id: guestCart.id } });
		});

		// 6. Invalider les caches
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
