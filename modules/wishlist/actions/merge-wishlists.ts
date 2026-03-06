"use server";

import { updateTag } from "next/cache";
import { prisma } from "@/shared/lib/prisma";
import { getWishlistInvalidationTags } from "@/modules/wishlist/constants/cache";
import { success, error, handleActionError, enforceRateLimit } from "@/shared/lib/actions";
import { Prisma } from "@/app/generated/prisma/client";
import { getRateLimitIdentifier, getClientIp } from "@/shared/lib/rate-limit";
import { WISHLIST_LIMITS } from "@/shared/lib/rate-limit-config";
import { headers } from "next/headers";
import { getSession } from "@/modules/auth/lib/get-current-session";
import type { MergeWishlistsResult } from "../types/wishlist.types";
import {
	WISHLIST_ERROR_MESSAGES,
	WISHLIST_INFO_MESSAGES,
} from "@/modules/wishlist/constants/error-messages";
import { WISHLIST_MAX_ITEMS } from "@/modules/wishlist/constants/wishlist.constants";
import { getGuestWishlistForMerge, getUserWishlistForMerge } from "../data/get-wishlist-for-merge";
import { isValidUuidV4 } from "@/modules/wishlist/lib/wishlist-session";

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
	sessionId: string,
): Promise<MergeWishlistsResult> {
	try {
		// 0a. Validate sessionId format (prevent arbitrary session injection)
		if (!isValidUuidV4(sessionId)) {
			return error(WISHLIST_ERROR_MESSAGES.GENERAL_ERROR);
		}

		// 0b. Vérification de sécurité: le userId doit correspondre à l'utilisateur connecté
		// Empêche un attaquant de fusionner la wishlist d'un autre utilisateur
		const currentSession = await getSession();
		if (!currentSession?.user.id || currentSession.user.id !== userId) {
			return error(WISHLIST_ERROR_MESSAGES.UNAUTHORIZED);
		}

		// 0c. Rate limiting uniforme avec les autres actions wishlist (avec IP fallback)
		const headersList = await headers();
		const ipAddress = await getClientIp(headersList);
		const rateLimitId = getRateLimitIdentifier(userId, sessionId, ipAddress);
		const rateCheck = await enforceRateLimit(rateLimitId, WISHLIST_LIMITS.MERGE, ipAddress);
		if ("error" in rateCheck) return rateCheck.error;

		// 0d. Vérifier que l'utilisateur existe (protection contre appels directs)
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: { id: true, deletedAt: true },
		});

		if (!user || user.deletedAt) {
			return error(WISHLIST_ERROR_MESSAGES.GENERAL_ERROR);
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
			return success(WISHLIST_INFO_MESSAGES.NO_ITEMS_TO_MERGE, { addedItems: 0, skippedItems: 0 });
		}

		// 3. Créer la wishlist utilisateur si elle n'existe pas
		// Guard against P2002: two concurrent logins for the same userId could both
		// attempt the create simultaneously. Fall back to findUnique on conflict.
		let targetWishlist = userWishlist;
		if (!targetWishlist) {
			const itemsSelect = { select: { productId: true } } as const;
			try {
				targetWishlist = await prisma.wishlist.create({
					data: { userId, expiresAt: null },
					select: { id: true, items: itemsSelect },
				});
			} catch (e) {
				if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
					// Parallel request already created the wishlist — fetch it
					targetWishlist = await prisma.wishlist.findUnique({
						where: { userId },
						select: { id: true, items: itemsSelect },
					});
					if (!targetWishlist) return error(WISHLIST_ERROR_MESSAGES.GENERAL_ERROR);
				} else {
					throw e;
				}
			}
		}

		// 4. Preparer les items a fusionner (strategie UNION)
		const userProductIds = new Set(targetWishlist.items.map((item) => item.productId));

		// Filter valid items to add (public, non-orphan, not already in user wishlist)
		const validItems = guestWishlist.items.filter((guestItem) => {
			if (!guestItem.productId || !guestItem.product) return false;
			if (guestItem.product.status !== "PUBLIC") return false;
			if (userProductIds.has(guestItem.productId)) return false;
			return true;
		});

		// Cap to WISHLIST_MAX_ITEMS to prevent unbounded growth
		const availableSlots = Math.max(0, WISHLIST_MAX_ITEMS - targetWishlist.items.length);
		const itemsToAdd = validItems.slice(0, availableSlots);

		const skippedCount = guestWishlist.items.length - itemsToAdd.length;

		// 5. Fusionner les items dans une transaction atomique
		await prisma.$transaction(async (tx) => {
			if (itemsToAdd.length > 0) {
				await tx.wishlistItem.createMany({
					data: itemsToAdd.map((item) => ({
						wishlistId: targetWishlist.id,
						productId: item.productId,
					})),
				});
			}

			// 6. Supprimer la wishlist visiteur (dans la meme transaction)
			await tx.wishlist.delete({ where: { id: guestWishlist.id } });
		});

		const addedCount = itemsToAdd.length;

		// 7. Invalider les caches
		const guestTags = getWishlistInvalidationTags(undefined, sessionId);
		const userTags = getWishlistInvalidationTags(userId, undefined);
		[...guestTags, ...userTags].forEach((tag) => updateTag(tag));

		return success(
			addedCount > 0
				? `${addedCount} favori${addedCount > 1 ? "s" : ""} ajoute${addedCount > 1 ? "s" : ""} a votre wishlist`
				: "Tous les favoris etaient deja dans votre liste",
			{
				addedItems: addedCount,
				skippedItems: skippedCount,
			},
		);
	} catch (e) {
		return handleActionError(e, WISHLIST_ERROR_MESSAGES.GENERAL_ERROR);
	}
}
