"use server";

import { getSession } from "@/modules/auth/lib/get-current-session";
import { getWishlistInvalidationTags } from "@/modules/wishlist/constants/cache";
import { updateTag } from "next/cache";
import { prisma } from "@/shared/lib/prisma";
import { getRateLimitIdentifier, getClientIp } from "@/shared/lib/rate-limit";
import { WISHLIST_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";
import { headers } from "next/headers";
import { getWishlistSessionId } from "@/modules/wishlist/lib/wishlist-session";
import { WISHLIST_ERROR_MESSAGES } from "@/modules/wishlist/constants/error-messages";
import { handleActionError, success, enforceRateLimit } from "@/shared/lib/actions";

/**
 * Server Action pour vider integralement la wishlist
 * Compatible avec useActionState de React 19
 *
 * Supprime tous les items de la wishlist en une seule operation atomique.
 * Ne supprime pas la Wishlist elle-meme pour preserver session/expiration.
 *
 * Supporte les utilisateurs connectes ET les visiteurs (sessions invite).
 *
 * Note: utilise getWishlistSessionId (pas getOrCreate) car il n'y a aucun interet
 * a creer une wishlist juste pour la vider.
 *
 * Rate limiting via WISHLIST_LIMITS.CLEAR (5/5min — operation destructive bulk).
 */
export async function clearWishlist(
	_prevState: ActionState | undefined,
	_formData?: FormData,
): Promise<ActionState> {
	try {
		// 1. Recuperer l'authentification (user ou session invite existante)
		const session = await getSession();
		const userId = session?.user.id;
		const sessionId = !userId ? await getWishlistSessionId() : null;

		if (!userId && !sessionId) {
			return success(WISHLIST_ERROR_MESSAGES.WISHLIST_ALREADY_EMPTY, { deletedCount: 0 });
		}

		// 2. Rate limiting (protection anti-spam)
		const headersList = await headers();
		const ipAddress = await getClientIp(headersList);
		const rateLimitId = getRateLimitIdentifier(userId ?? null, sessionId, ipAddress);
		const rateCheck = await enforceRateLimit(rateLimitId, WISHLIST_LIMITS.CLEAR, ipAddress);
		if ("error" in rateCheck) return rateCheck.error;

		// 3. Recuperer la wishlist (ownership via userId/sessionId, no IDOR risk)
		const wishlist = await prisma.wishlist.findFirst({
			where: userId ? { userId } : { sessionId: sessionId! },
			select: {
				id: true,
				_count: { select: { items: true } },
			},
		});

		if (!wishlist) {
			return success(WISHLIST_ERROR_MESSAGES.WISHLIST_ALREADY_EMPTY, { deletedCount: 0 });
		}

		const initialCount = wishlist._count.items;
		if (initialCount === 0) {
			return success(WISHLIST_ERROR_MESSAGES.WISHLIST_ALREADY_EMPTY, { deletedCount: 0 });
		}

		// 4. Transaction atomique: deleteMany + refresh wishlist timestamp
		const deleteResult = await prisma.$transaction(async (tx) => {
			const result = await tx.wishlistItem.deleteMany({
				where: { wishlistId: wishlist.id },
			});

			await tx.wishlist.update({
				where: { id: wishlist.id },
				data: {
					updatedAt: new Date(),
				},
			});

			return result;
		});

		// 5. Invalidation cache immediate (read-your-own-writes)
		const tags = getWishlistInvalidationTags(userId, sessionId ?? undefined);
		tags.forEach((tag) => updateTag(tag));

		return success(
			deleteResult.count > 1 ? `${deleteResult.count} favoris supprimes` : "Favori supprime",
			{ deletedCount: deleteResult.count },
		);
	} catch (e) {
		return handleActionError(e, WISHLIST_ERROR_MESSAGES.GENERAL_ERROR);
	}
}
