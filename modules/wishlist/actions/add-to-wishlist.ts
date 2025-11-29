"use server";

import { getSession } from "@/shared/utils/get-session";
import { getWishlistInvalidationTags } from "@/modules/wishlist/constants/cache";
import { updateTag } from "next/cache";
import { prisma } from "@/shared/lib/prisma";
import {
	checkRateLimit,
	getClientIp,
	getRateLimitIdentifier,
} from "@/shared/lib/rate-limit";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { addToWishlistSchema } from "@/modules/wishlist/schemas/wishlist.schemas";

// Rate limit config pour wishlist (moins strict que cart)
const WISHLIST_RATE_LIMIT = {
	maxRequests: 20,
	windowMs: 60000, // 1 minute
};

/**
 * Server Action pour ajouter un article à la wishlist
 * Compatible avec useActionState de React 19
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
		// 1. Vérifier l'authentification
		const session = await getSession();
		const userId = session?.user?.id;

		if (!userId) {
			return {
				status: ActionStatus.ERROR,
				message:
					"Vous devez être connecté pour ajouter des articles à votre wishlist",
			};
		}

		// 2. Extraction des données du FormData
		const rawData = {
			skuId: formData.get("skuId") as string,
		};

		// 3. Validation avec Zod
		const result = addToWishlistSchema.safeParse(rawData);
		if (!result.success) {
			const firstError = result.error.issues[0];
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: firstError?.message || "Données invalides",
			};
		}

		const validatedData = result.data;

		// 4. Rate limiting (protection anti-spam)
		const headersList = await headers();
		const ipAddress = await getClientIp(headersList);

		const rateLimitId = getRateLimitIdentifier(userId, null, ipAddress);
		const rateLimit = checkRateLimit(rateLimitId, WISHLIST_RATE_LIMIT);

		if (!rateLimit.success) {
			return {
				status: ActionStatus.ERROR,
				message:
					rateLimit.error || "Trop de requêtes. Veuillez réessayer plus tard.",
				data: {
					retryAfter: rateLimit.retryAfter,
					reset: rateLimit.reset,
				},
			};
		}

		// 5. Valider le SKU (existence et status actif)
		const sku = await prisma.productSku.findUnique({
			where: { id: validatedData.skuId },
			select: {
				id: true,
				sku: true,
				isActive: true,
				priceInclTax: true,
				product: {
					select: {
						status: true,
					},
				},
			},
		});

		if (!sku || !sku.isActive || sku.product.status !== "PUBLIC") {
			return {
				status: ActionStatus.ERROR,
				message: "Produit indisponible",
			};
		}

		// 6. Transaction: Récupérer la wishlist et ajouter l'item
		const transactionResult = await prisma.$transaction(async (tx) => {
			// 6a. Récupérer la wishlist (normalement créée à l'inscription)
			// Fallback avec upsert pour :
			// - Utilisateurs existants créés avant cette fonctionnalité
			// - Cas d'échec du hook onCustomerCreate lors de l'inscription
			const wishlist = await tx.wishlist.upsert({
				where: { userId },
				create: { userId },
				update: {},
				select: {
					id: true,
				},
			});

			// 6b. Vérifier si le SKU est déjà dans la wishlist
			const existingItem = await tx.wishlistItem.findUnique({
				where: {
					wishlistId_skuId: {
						wishlistId: wishlist.id,
						skuId: validatedData.skuId,
					},
				},
			});

			if (existingItem) {
				return {
					wishlistItem: existingItem,
					wishlist,
					alreadyExists: true,
				};
			}

			// 6c. Créer le wishlist item
			const wishlistItem = await tx.wishlistItem.create({
				data: {
					wishlistId: wishlist.id,
					skuId: validatedData.skuId,
					priceAtAdd: sku.priceInclTax, // Snapshot du prix
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
		const tags = getWishlistInvalidationTags(
			userId,
			undefined,
			transactionResult.wishlist.id
		);
		tags.forEach(tag => updateTag(tag));

		// 8. Revalidation complète pour mise à jour du header (badge count)
		revalidatePath("/", "layout");

		return {
			status: ActionStatus.SUCCESS,
			message: transactionResult.alreadyExists
				? "Déjà dans votre wishlist"
				: "Ajouté à votre wishlist",
			data: {
				wishlistItemId: transactionResult.wishlistItem.id,
				wishlistId: transactionResult.wishlist.id,
			},
		};
	} catch (e) {
		console.error('[ADD_TO_WISHLIST] Error:', e);
		return {
			status: ActionStatus.ERROR,
			message: "Une erreur est survenue. Veuillez réessayer.",
		};
	}
}
