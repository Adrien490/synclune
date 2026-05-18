"use server";

import { getSession } from "@/modules/auth/lib/get-current-session";
import { getWishlistInvalidationTags } from "@/modules/wishlist/constants/cache";
import { updateTag } from "next/cache";
import { prisma } from "@/shared/lib/prisma";
import { getRateLimitIdentifier, getClientIp } from "@/shared/lib/rate-limit";
import { WISHLIST_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";
import { headers } from "next/headers";
import { addToWishlistSchema } from "@/modules/wishlist/schemas/wishlist.schemas";
import { getOrCreateWishlistSessionId } from "@/modules/wishlist/lib/wishlist-session";
import { WISHLIST_ERROR_MESSAGES } from "@/modules/wishlist/constants/error-messages";
import { addProductToWishlist } from "@/modules/wishlist/services/upsert-wishlist-item.service";
import { Prisma } from "@/app/generated/prisma/client";
import {
	validateInput,
	handleActionError,
	success,
	error,
	enforceRateLimit,
	safeFormGet,
} from "@/shared/lib/actions";

/**
 * Server Action pour ajouter un article à la wishlist
 * Compatible avec useActionState de React 19
 *
 * Supporte les utilisateurs connectés ET les visiteurs (sessions invité)
 *
 * Pattern:
 * 1. Validation des données (Zod)
 * 2. Rate limiting (protection anti-spam)
 * 3. Délégation à addProductToWishlist (service partagé avec toggle)
 * 4. Invalidation cache immédiate (read-your-own-writes)
 */
export async function addToWishlist(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Récupérer l'authentification (user ou session invité)
		const session = await getSession();
		const userId = session?.user.id;
		const sessionId = !userId ? await getOrCreateWishlistSessionId() : null;

		// Vérifier qu'on a soit un userId soit un sessionId
		if (!userId && !sessionId) {
			return error(WISHLIST_ERROR_MESSAGES.GENERAL_ERROR);
		}

		// 2. Rate limiting (protection anti-spam) — before validation to prevent enumeration
		const headersList = await headers();
		const ipAddress = await getClientIp(headersList);
		const rateLimitId = getRateLimitIdentifier(userId ?? null, sessionId, ipAddress);
		const rateCheck = await enforceRateLimit(rateLimitId, WISHLIST_LIMITS.ADD, ipAddress);
		if ("error" in rateCheck) return rateCheck.error;

		// 3. Extraction des données du FormData + validation avec Zod
		const validated = validateInput(addToWishlistSchema, {
			productId: safeFormGet(formData, "productId"),
		});
		if ("error" in validated) return validated.error;

		const { productId } = validated.data;

		// 4. Transaction: délégation au service partagé `addProductToWishlist`
		// (qui throw BusinessError pour PRODUCT_NOT_PUBLIC / WISHLIST_FULL,
		// et laisse remonter P2002 pour race condition double-submit)
		const result = await prisma.$transaction((tx) =>
			addProductToWishlist(tx, {
				userId: userId ?? null,
				sessionId,
				productId,
			}),
		);

		// 5. Invalidation cache immédiate (read-your-own-writes)
		const tags = getWishlistInvalidationTags(userId, sessionId ?? undefined);
		tags.forEach((tag) => updateTag(tag));

		return success("Ajoute a vos favoris", {
			wishlistItemId: result.wishlistItemId,
		});
	} catch (e) {
		// Unique constraint violation (wishlistId, productId) — race double-submit
		if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
			return success("Deja dans vos favoris");
		}
		return handleActionError(e, WISHLIST_ERROR_MESSAGES.GENERAL_ERROR);
	}
}
