"use server";

import { updateTag } from "next/cache";
import { prisma } from "@/shared/lib/prisma";
import { getWishlistInvalidationTags } from "@/modules/wishlist/constants/cache";
import { ActionStatus } from "@/shared/types/server-action";
import { checkRateLimit, getClientIp, getRateLimitIdentifier } from "@/shared/lib/rate-limit";
import { WISHLIST_LIMITS } from "@/shared/lib/rate-limit-config";
import { headers } from "next/headers";
import { getSession } from "@/modules/auth/lib/get-current-session";
import type { MergeWishlistsResult } from "../types/wishlist.types";
import { WISHLIST_ERROR_MESSAGES, WISHLIST_INFO_MESSAGES } from "@/modules/wishlist/constants/error-messages";
import { getGuestWishlistForMerge, getUserWishlistForMerge } from "../data/get-wishlist-for-merge";

// Re-export pour retrocompatibilite
export type { MergeWishlistsResult } from "../types/wishlist.types";

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
		// 0a. Vérification de sécurité: le userId doit correspondre à l'utilisateur connecté
		// Empêche un attaquant de fusionner la wishlist d'un autre utilisateur
		const currentSession = await getSession();
		if (!currentSession?.user?.id || currentSession.user.id !== userId) {
			return {
				status: ActionStatus.ERROR,
				message: "Non autorisé",
			};
		}

		// 0b. Rate limiting uniforme avec les autres actions wishlist (avec IP fallback)
		const headersList = await headers();
		const ipAddress = await getClientIp(headersList);
		const rateLimitId = getRateLimitIdentifier(userId, sessionId, ipAddress);
		const rateLimit = checkRateLimit(rateLimitId, WISHLIST_LIMITS.MERGE);

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
				message: WISHLIST_ERROR_MESSAGES.GENERAL_ERROR,
			};
		}

		// 1. Récupérer les deux wishlists (via data/)
		const [guestWishlist, userWishlist] = await Promise.all([
			getGuestWishlistForMerge(sessionId),
			getUserWishlistForMerge(userId),
		]);

		// 2. Si pas de wishlist visiteur, rien à faire
		if (!guestWishlist || guestWishlist.items.length === 0) {
			if (guestWishlist) {
				await prisma.wishlist.delete({ where: { id: guestWishlist.id } });
			}
			return {
				status: ActionStatus.SUCCESS,
				message: WISHLIST_INFO_MESSAGES.NO_ITEMS_TO_MERGE,
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
							productId: true,
						},
					},
				},
			});
		}

		// 4. Préparer les items à fusionner (stratégie UNION)
		const userProductIds = new Set(targetWishlist.items.map((item) => item.productId));

		let addedCount = 0;
		let skippedCount = 0;

		// 5. Fusionner les items dans une transaction atomique
		await prisma.$transaction(async (tx) => {
			for (const guestItem of guestWishlist.items) {
				// Skip les produits non publics
				if (guestItem.product.status !== "PUBLIC") {
					skippedCount++;
					continue;
				}

				// Skip si déjà dans la wishlist utilisateur
				if (userProductIds.has(guestItem.productId)) {
					skippedCount++;
					continue;
				}

				// Ajouter l'item à la wishlist utilisateur
				await tx.wishlistItem.create({
					data: {
						wishlistId: targetWishlist.id,
						productId: guestItem.productId,
					},
				});
				addedCount++;
			}

			// 6. Supprimer la wishlist visiteur (dans la même transaction)
			await tx.wishlist.delete({ where: { id: guestWishlist.id } });
		});

		// 7. Invalider les caches
		const guestTags = getWishlistInvalidationTags(undefined, sessionId);
		const userTags = getWishlistInvalidationTags(userId, undefined);
		[...guestTags, ...userTags].forEach(tag => updateTag(tag));

		return {
			status: ActionStatus.SUCCESS,
			message: addedCount > 0
				? `${addedCount} favori${addedCount > 1 ? "s" : ""} ajouté${addedCount > 1 ? "s" : ""} à ta wishlist`
				: "Tous les favoris étaient déjà dans ta liste",
			data: {
				addedItems: addedCount,
				skippedItems: skippedCount,
			},
		};
	} catch (e) {
		console.error("[MERGE_WISHLISTS]", e);
		return {
			status: ActionStatus.ERROR,
			message: WISHLIST_ERROR_MESSAGES.GENERAL_ERROR,
		};
	}
}
