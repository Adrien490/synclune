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
import {
	getOrCreateWishlistSessionId,
	getWishlistExpirationDate,
} from "@/modules/wishlist/lib/wishlist-session";
import { WISHLIST_ERROR_MESSAGES } from "@/modules/wishlist/constants/error-messages";
import { WISHLIST_MAX_ITEMS } from "@/modules/wishlist/constants/wishlist.constants";
import { validateInput, handleActionError, success, error, enforceRateLimit } from "@/shared/lib/actions";

/**
 * Server Action pour ajouter un article à la wishlist
 * Compatible avec useActionState de React 19
 *
 * Supporte les utilisateurs connectés ET les visiteurs (sessions invité)
 *
 * Pattern:
 * 1. Validation des données (Zod)
 * 2. Rate limiting (protection anti-spam)
 * 3. Validation du SKU (existence et status)
 * 4. Transaction DB (upsert wishlist + create item)
 * 5. Invalidation cache immédiate (read-your-own-writes)
 */
export async function addToWishlist(
	_: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Récupérer l'authentification (user ou session invité)
		const session = await getSession();
		const userId = session?.user?.id;
		const sessionId = !userId ? await getOrCreateWishlistSessionId() : null;

		// Vérifier qu'on a soit un userId soit un sessionId
		if (!userId && !sessionId) {
			return error(WISHLIST_ERROR_MESSAGES.GENERAL_ERROR);
		}

		// 2. Extraction des données du FormData
		const rawData = {
			productId: formData.get("productId") as string,
		};

		// 3. Validation avec Zod
		const validated = validateInput(addToWishlistSchema, rawData);
		if ("error" in validated) return validated.error;

		const validatedData = validated.data;

		// 4. Rate limiting (protection anti-spam)
		const headersList = await headers();
		const ipAddress = await getClientIp(headersList);
		const rateLimitId = getRateLimitIdentifier(userId ?? null, sessionId, ipAddress);
		const rateCheck = await enforceRateLimit(rateLimitId, WISHLIST_LIMITS.ADD);
		if ("error" in rateCheck) return rateCheck.error;

		// 5. Valider le produit (existence et status)
		const product = await prisma.product.findUnique({
			where: { id: validatedData.productId },
			select: {
				id: true,
				status: true,
			},
		});

		if (!product || product.status !== "PUBLIC") {
			return error(WISHLIST_ERROR_MESSAGES.PRODUCT_NOT_PUBLIC);
		}

		// 6. Transaction: Récupérer/créer la wishlist et ajouter l'item
		const transactionResult = await prisma.$transaction(async (tx) => {
			// 6a. Récupérer ou créer la wishlist
			// Pour utilisateur connecté : upsert par userId
			// Pour visiteur : upsert par sessionId
			const wishlist = await tx.wishlist.upsert({
				where: userId ? { userId } : { sessionId: sessionId! },
				create: {
					userId: userId || null,
					sessionId: sessionId || null,
					expiresAt: userId ? null : getWishlistExpirationDate(),
				},
				update: {
					// Rafraîchir l'expiration pour les visiteurs
					expiresAt: userId ? null : getWishlistExpirationDate(),
				},
				select: {
					id: true,
				},
			});

			// 6b. Check max items limit
			const itemCount = await tx.wishlistItem.count({
				where: { wishlistId: wishlist.id },
			});
			if (itemCount >= WISHLIST_MAX_ITEMS) {
				throw new Error("WISHLIST_FULL");
			}

			// 6c. Vérifier si ce produit est déjà dans la wishlist
			const existingItem = await tx.wishlistItem.findFirst({
				where: {
					wishlistId: wishlist.id,
					productId: validatedData.productId,
				},
			});

			if (existingItem) {
				return {
					wishlistItem: existingItem,
					wishlist,
					alreadyExists: true,
				};
			}

			// 6d. Créer le wishlist item
			const wishlistItem = await tx.wishlistItem.create({
				data: {
					wishlistId: wishlist.id,
					productId: validatedData.productId,
				},
				select: {
					id: true,
				},
			});

			return {
				wishlistItem,
				wishlist,
				alreadyExists: false,
			};
		});

		// 7. Invalidation cache immédiate (read-your-own-writes)
		const tags = getWishlistInvalidationTags(userId, sessionId || undefined);
		tags.forEach(tag => updateTag(tag));

		return success(
			transactionResult.alreadyExists
				? "Deja dans votre wishlist"
				: "Ajoute a votre wishlist",
			{
				wishlistItemId: transactionResult.wishlistItem.id,
				wishlistId: transactionResult.wishlist.id,
			},
		);
	} catch (e) {
		if (e instanceof Error && e.message === "WISHLIST_FULL") {
			return error(WISHLIST_ERROR_MESSAGES.WISHLIST_FULL);
		}
		return handleActionError(e, WISHLIST_ERROR_MESSAGES.GENERAL_ERROR);
	}
}
