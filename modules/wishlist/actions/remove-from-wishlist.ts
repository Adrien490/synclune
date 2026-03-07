"use server";

import { getSession } from "@/modules/auth/lib/get-current-session";
import { getWishlistInvalidationTags } from "@/modules/wishlist/constants/cache";
import { updateTag } from "next/cache";
import { prisma } from "@/shared/lib/prisma";
import { getRateLimitIdentifier, getClientIp } from "@/shared/lib/rate-limit";
import { WISHLIST_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";
import { headers } from "next/headers";
import { removeFromWishlistSchema } from "@/modules/wishlist/schemas/wishlist.schemas";
import {
	getWishlistSessionId,
	getWishlistExpirationDate,
} from "@/modules/wishlist/lib/wishlist-session";
import { WISHLIST_ERROR_MESSAGES } from "@/modules/wishlist/constants/error-messages";
import {
	validateInput,
	handleActionError,
	success,
	error,
	enforceRateLimit,
	safeFormGet,
} from "@/shared/lib/actions";

/**
 * Server Action pour retirer un article de la wishlist
 * Compatible avec useActionState de React 19
 *
 * Supporte les utilisateurs connectes ET les visiteurs (sessions invite)
 *
 * Note: intentionally does NOT validate product status (PUBLIC/ARCHIVED).
 * Users must be able to remove archived or private products from their wishlist.
 */
export async function removeFromWishlist(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Recuperer l'authentification (user ou session invite)
		const session = await getSession();
		const userId = session?.user.id;
		const sessionId = !userId ? await getWishlistSessionId() : null;

		if (!userId && !sessionId) {
			return error(WISHLIST_ERROR_MESSAGES.WISHLIST_NOT_FOUND);
		}

		// 2. Rate limiting (protection anti-spam) — before validation to prevent enumeration
		const headersList = await headers();
		const ipAddress = await getClientIp(headersList);
		const rateLimitId = getRateLimitIdentifier(userId ?? null, sessionId, ipAddress);
		const rateCheck = await enforceRateLimit(rateLimitId, WISHLIST_LIMITS.REMOVE, ipAddress);
		if ("error" in rateCheck) return rateCheck.error;

		// 3. Validation avec Zod
		const validated = validateInput(removeFromWishlistSchema, {
			productId: safeFormGet(formData, "productId"),
		});
		if ("error" in validated) return validated.error;

		const validatedData = validated.data;

		// 4. Recuperer la wishlist de l'utilisateur ou visiteur
		const wishlist = await prisma.wishlist.findFirst({
			where: userId ? { userId } : { sessionId },
			select: { id: true },
		});

		if (!wishlist) {
			return error(WISHLIST_ERROR_MESSAGES.WISHLIST_NOT_FOUND);
		}

		// 5. Supprimer l'item et mettre a jour le timestamp
		const deleteResult = await prisma.$transaction(async (tx) => {
			const result = await tx.wishlistItem.deleteMany({
				where: {
					wishlistId: wishlist.id,
					productId: validatedData.productId,
				},
			});

			await tx.wishlist.update({
				where: { id: wishlist.id },
				data: {
					updatedAt: new Date(),
					expiresAt: userId ? null : getWishlistExpirationDate(),
				},
			});

			return result;
		});

		// 6. Invalidation cache immediate (read-your-own-writes)
		const tags = getWishlistInvalidationTags(userId, sessionId ?? undefined);
		tags.forEach((tag) => updateTag(tag));

		if (deleteResult.count === 0) {
			return error(WISHLIST_ERROR_MESSAGES.ITEM_NOT_FOUND);
		}

		return success("Retire de votre wishlist", {
			removed: true,
		});
	} catch (e) {
		return handleActionError(e, WISHLIST_ERROR_MESSAGES.GENERAL_ERROR);
	}
}
