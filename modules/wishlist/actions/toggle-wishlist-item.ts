"use server";

import { getSession } from "@/modules/auth/lib/get-current-session";
import { getWishlistInvalidationTags } from "@/modules/wishlist/constants/cache";
import { updateTag } from "next/cache";
import { prisma } from "@/shared/lib/prisma";
import { getRateLimitIdentifier } from "@/shared/lib/rate-limit";
import { WISHLIST_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";
import { headers } from "next/headers";
import { toggleWishlistItemSchema } from "@/modules/wishlist/schemas/wishlist.schemas";
import {
	getOrCreateWishlistSessionId,
	getWishlistExpirationDate,
} from "@/modules/wishlist/lib/wishlist-session";
import { WISHLIST_ERROR_MESSAGES } from "@/modules/wishlist/constants/error-messages";
import { validateInput, handleActionError, success, error, enforceRateLimit } from "@/shared/lib/actions";
import { getClientIp } from "@/shared/lib/rate-limit";

/**
 * Server Action pour toggle un article dans la wishlist
 * Si present → retire, si absent → ajoute
 *
 * Supporte les utilisateurs connectes ET les visiteurs (sessions invite)
 *
 * Pattern:
 * 1. Validation des donnees (Zod)
 * 2. Rate limiting (protection anti-spam)
 * 3. Recuperation/creation wishlist (user ou session)
 * 4. Transaction DB (check existence → add ou remove)
 * 5. Invalidation cache immediate (read-your-own-writes)
 */
export async function toggleWishlistItem(
	_: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Recuperer l'authentification (user ou session invite)
		const session = await getSession();
		const userId = session?.user?.id;
		const sessionId = !userId ? await getOrCreateWishlistSessionId() : null;

		if (!userId && !sessionId) {
			return error(WISHLIST_ERROR_MESSAGES.GENERAL_ERROR);
		}

		// 2. Validation avec Zod
		const validated = validateInput(toggleWishlistItemSchema, {
			productId: formData.get("productId") as string,
		});
		if ("error" in validated) return validated.error;

		const validatedData = validated.data;

		// 3. Rate limiting (protection anti-spam)
		const headersList = await headers();
		const ipAddress = await getClientIp(headersList);
		const rateLimitId = getRateLimitIdentifier(userId ?? null, sessionId, ipAddress);
		const rateCheck = await enforceRateLimit(rateLimitId, WISHLIST_LIMITS.TOGGLE);
		if ("error" in rateCheck) return rateCheck.error;

		// 4. Valider le produit (existence et status)
		const product = await prisma.product.findUnique({
			where: { id: validatedData.productId },
			select: { id: true, status: true },
		});

		if (!product || product.status !== "PUBLIC") {
			return error(WISHLIST_ERROR_MESSAGES.PRODUCT_NOT_PUBLIC);
		}

		// 5. Transaction: Recuperer la wishlist, verifier existence, ajouter ou retirer
		const transactionResult = await prisma.$transaction(async (tx) => {
			// Recuperer ou creer la wishlist
			const wishlist = await tx.wishlist.upsert({
				where: userId ? { userId } : { sessionId: sessionId! },
				create: {
					userId: userId || null,
					sessionId: sessionId || null,
					expiresAt: userId ? null : getWishlistExpirationDate(),
				},
				update: {
					expiresAt: userId ? null : getWishlistExpirationDate(),
				},
				select: { id: true },
			});

			// Verifier si ce produit est deja dans la wishlist
			const existingItem = await tx.wishlistItem.findFirst({
				where: {
					wishlistId: wishlist.id,
					productId: validatedData.productId,
				},
			});

			if (existingItem) {
				await tx.wishlistItem.delete({
					where: { id: existingItem.id },
				});

				await tx.wishlist.update({
					where: { id: wishlist.id },
					data: { updatedAt: new Date() },
				});

				return {
					wishlist,
					action: "removed" as const,
					wishlistItemId: undefined,
				};
			} else {
				const wishlistItem = await tx.wishlistItem.create({
					data: {
						wishlistId: wishlist.id,
						productId: validatedData.productId,
					},
					select: { id: true },
				});

				await tx.wishlist.update({
					where: { id: wishlist.id },
					data: { updatedAt: new Date() },
				});

				return {
					wishlist,
					action: "added" as const,
					wishlistItemId: wishlistItem.id,
				};
			}
		});

		// 6. Invalidation cache immediate (read-your-own-writes)
		const tags = getWishlistInvalidationTags(userId, sessionId || undefined);
		tags.forEach(tag => updateTag(tag));

		return success(
			transactionResult.action === "added"
				? "Ajoute a ta wishlist"
				: "Retire de ta wishlist",
			{
				wishlistId: transactionResult.wishlist.id,
				action: transactionResult.action,
				wishlistItemId: transactionResult.wishlistItemId,
			},
		);
	} catch (e) {
		return handleActionError(e, WISHLIST_ERROR_MESSAGES.GENERAL_ERROR);
	}
}
