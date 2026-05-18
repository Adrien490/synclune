"use server";

import { getSession } from "@/modules/auth/lib/get-current-session";
import { getWishlistInvalidationTags } from "@/modules/wishlist/constants/cache";
import { updateTag } from "next/cache";
import { prisma } from "@/shared/lib/prisma";
import { getRateLimitIdentifier, getClientIp } from "@/shared/lib/rate-limit";
import { WISHLIST_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";
import { headers } from "next/headers";
import { toggleWishlistItemSchema } from "@/modules/wishlist/schemas/wishlist.schemas";
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
 * Server Action pour toggle un article dans la wishlist
 * Si present → retire, si absent → ajoute
 *
 * Supporte les utilisateurs connectes ET les visiteurs (sessions invite)
 *
 * Pattern:
 * 1. Validation des donnees (Zod)
 * 2. Rate limiting (protection anti-spam)
 * 3. Récupération/création wishlist + check existence
 * 4. Si existe → delete ; sinon → délégation au service `addProductToWishlist`
 * 5. Invalidation cache immediate (read-your-own-writes)
 */
export async function toggleWishlistItem(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Recuperer l'authentification (user ou session invite)
		const session = await getSession();
		const userId = session?.user.id;
		const sessionId = !userId ? await getOrCreateWishlistSessionId() : null;

		if (!userId && !sessionId) {
			return error(WISHLIST_ERROR_MESSAGES.GENERAL_ERROR);
		}

		// 2. Rate limiting (protection anti-spam) — before validation to prevent enumeration
		const headersList = await headers();
		const ipAddress = await getClientIp(headersList);
		const rateLimitId = getRateLimitIdentifier(userId ?? null, sessionId, ipAddress);
		const rateCheck = await enforceRateLimit(rateLimitId, WISHLIST_LIMITS.TOGGLE, ipAddress);
		if ("error" in rateCheck) return rateCheck.error;

		// 3. Validation avec Zod
		const validated = validateInput(toggleWishlistItemSchema, {
			productId: safeFormGet(formData, "productId"),
		});
		if ("error" in validated) return validated.error;

		const { productId } = validated.data;

		// 4. Transaction: lookup wishlist existante → si item présent retire,
		//    sinon délègue à addProductToWishlist (qui upsert + valide + create).
		const transactionResult = await prisma.$transaction(async (tx) => {
			// 4a. Lookup wishlist existante (sans création — pas de upsert ici car
			//     le path "add" délègue à addProductToWishlist qui fait son propre upsert).
			const existingWishlist = await tx.wishlist.findFirst({
				where: userId ? { userId } : { sessionId: sessionId! },
				select: {
					id: true,
					items: {
						where: { productId },
						select: { id: true },
						take: 1,
					},
				},
			});

			const existingItem = existingWishlist?.items[0];

			// Path "remove" : item existe → delete + refresh timestamp
			// (existingItem truthy implique existingWishlist truthy par construction)
			if (existingItem) {
				await tx.wishlistItem.delete({ where: { id: existingItem.id } });
				await tx.wishlist.update({
					where: { id: existingWishlist!.id },
					data: { updatedAt: new Date() },
				});

				return {
					action: "removed" as const,
					wishlistItemId: undefined,
				};
			}

			// Path "add" : pas d'item existant → service partagé (upsert wishlist + check
			// cap + validation produit + create item, tout dans le scope tx).
			const created = await addProductToWishlist(tx, {
				userId: userId ?? null,
				sessionId,
				productId,
			});

			return {
				action: "added" as const,
				wishlistItemId: created.wishlistItemId,
			};
		});

		// 5. Invalidation cache immediate (read-your-own-writes)
		const tags = getWishlistInvalidationTags(userId, sessionId ?? undefined);
		tags.forEach((tag) => updateTag(tag));

		return success(
			transactionResult.action === "added" ? "Ajoute a vos favoris" : "Retire de vos favoris",
			{
				action: transactionResult.action,
				wishlistItemId: transactionResult.wishlistItemId,
			},
		);
	} catch (e) {
		// Unique constraint violation (wishlistId, productId) — race double-submit
		// concurrent (très rare ici car on a check existence avant), traité comme succès idempotent.
		if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
			return success("Deja dans vos favoris");
		}
		return handleActionError(e, WISHLIST_ERROR_MESSAGES.GENERAL_ERROR);
	}
}
