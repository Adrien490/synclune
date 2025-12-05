"use server";

import { updateTag } from "next/cache";
import { prisma } from "@/shared/lib/prisma";
import { getWishlistInvalidationTags } from "@/modules/wishlist/constants/cache";
import { ActionStatus } from "@/shared/types/server-action";
import { checkRateLimit, getClientIp, getRateLimitIdentifier } from "@/shared/lib/rate-limit";
import { WISHLIST_LIMITS } from "@/shared/lib/rate-limit-config";
import { headers } from "next/headers";

export type MergeWishlistsResult =
	| {
			status: typeof ActionStatus.SUCCESS;
			message: string;
			data: {
				addedItems: number;
				skippedItems: number;
			};
	  }
	| {
			status: typeof ActionStatus.ERROR;
			message: string;
	  };

/**
 * Fusionne la wishlist visiteur avec la wishlist utilisateur après connexion
 *
 * 🔄 ARCHITECTURE (Next.js 16 + React 19.2 compatible)
 * ------------------------------------------------
 * Cette fonction est appelée EXCLUSIVEMENT par le hook Better Auth lors de la connexion.
 * Elle ne gère PAS les cookies - c'est la responsabilité du hook appelant.
 *
 * Séparation des responsabilités :
 * - Hook Better Auth : Récupère et supprime les cookies via ctx.getCookie()/ctx.setCookie()
 * - mergeWishlists : Gère uniquement la logique métier du merge en base de données
 *
 * Stratégie de fusion : UNION
 * --------------------------
 * - Pour chaque item de la wishlist visiteur :
 *   - Si le SKU n'existe pas dans la wishlist utilisateur : ajouter
 *   - Si le SKU existe déjà : ignorer (pas de quantité à gérer)
 * - Supprimer la wishlist visiteur après fusion
 *
 * @param userId ID de l'utilisateur connecté
 * @param sessionId SessionId de la wishlist visiteur à fusionner
 */
export async function mergeWishlists(
	userId: string,
	sessionId: string
): Promise<MergeWishlistsResult> {
	try {
		// 0a. Rate limiting uniforme avec les autres actions wishlist (avec IP fallback)
		const headersList = await headers();
		const ipAddress = await getClientIp(headersList);
		const rateLimitId = getRateLimitIdentifier(userId, sessionId, ipAddress);
		const rateLimit = checkRateLimit(`merge-wishlists:${rateLimitId}`, WISHLIST_LIMITS.MERGE);

		if (!rateLimit.success) {
			return {
				status: ActionStatus.ERROR,
				message: "Trop de requêtes. Veuillez réessayer plus tard.",
			};
		}

		// 0b. Vérifier que l'utilisateur existe (protection contre appels directs)
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

		// 1. Récupérer les deux wishlists
		const [guestWishlist, userWishlist] = await Promise.all([
			prisma.wishlist.findUnique({
				where: { sessionId },
				include: {
					items: {
						include: {
							sku: {
								select: {
									id: true,
									isActive: true,
									priceInclTax: true,
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
			prisma.wishlist.findUnique({
				where: { userId },
				include: {
					items: {
						select: {
							skuId: true,
						},
					},
				},
			}),
		]);

		// 2. Si pas de wishlist visiteur, rien à faire
		if (!guestWishlist || guestWishlist.items.length === 0) {
			if (guestWishlist) {
				await prisma.wishlist.delete({ where: { id: guestWishlist.id } });
			}
			return {
				status: ActionStatus.SUCCESS,
				message: "Aucun favori à fusionner",
				data: { addedItems: 0, skippedItems: 0 },
			};
		}

		// 3. Créer la wishlist utilisateur si elle n'existe pas
		let targetWishlist = userWishlist;
		if (!targetWishlist) {
			targetWishlist = await prisma.wishlist.create({
				data: {
					userId,
					expiresAt: null, // Pas d'expiration pour utilisateur connecté
				},
				include: {
					items: {
						select: {
							skuId: true,
						},
					},
				},
			});
		}

		// 4. Préparer les items à fusionner (stratégie UNION)
		const userSkuIds = new Set(targetWishlist.items.map((item) => item.skuId));
		const guestSkuIds = guestWishlist.items.map((item) => item.skuId);

		let addedCount = 0;
		let skippedCount = 0;

		// 5. Fusionner les items dans une transaction atomique
		// Note: La validation des SKUs est faite INSIDE la transaction pour éviter les race conditions
		await prisma.$transaction(async (tx) => {
			// Re-valider les SKUs à l'intérieur de la transaction (protection contre race condition)
			const validSkus = await tx.productSku.findMany({
				where: {
					id: { in: guestSkuIds },
					isActive: true,
					product: { status: "PUBLIC" },
				},
				select: {
					id: true,
					priceInclTax: true,
				},
			});
			const validSkuMap = new Map(validSkus.map((sku) => [sku.id, sku]));

			for (const guestItem of guestWishlist.items) {
				const sku = validSkuMap.get(guestItem.skuId);

				// Skip les produits inactifs ou non trouvés
				if (!sku) {
					skippedCount++;
					continue;
				}

				// Skip si déjà dans la wishlist utilisateur
				if (userSkuIds.has(guestItem.skuId)) {
					skippedCount++;
					continue;
				}

				// Ajouter l'item à la wishlist utilisateur
				await tx.wishlistItem.create({
					data: {
						wishlistId: targetWishlist.id,
						skuId: guestItem.skuId,
						priceAtAdd: sku.priceInclTax, // Prix actuel validé dans la transaction
					},
				});
				addedCount++;
			}

			// 6. Supprimer la wishlist visiteur (dans la même transaction)
			await tx.wishlist.delete({ where: { id: guestWishlist.id } });
		});

		// 7. Invalider les caches
		const guestTags = getWishlistInvalidationTags(undefined, sessionId, guestWishlist.id);
		const userTags = getWishlistInvalidationTags(userId, undefined, targetWishlist.id);
		[...guestTags, ...userTags].forEach(tag => updateTag(tag));

		return {
			status: ActionStatus.SUCCESS,
			message: addedCount > 0
				? `${addedCount} favori${addedCount > 1 ? "s" : ""} ajouté${addedCount > 1 ? "s" : ""}`
				: "Tous les favoris étaient déjà dans votre liste",
			data: {
				addedItems: addedCount,
				skippedItems: skippedCount,
			},
		};
	} catch (error) {
		console.error('[MERGE_WISHLISTS] Error:', error);
		return {
			status: ActionStatus.ERROR,
			message: "Une erreur est survenue lors de la fusion des favoris",
		};
	}
}
