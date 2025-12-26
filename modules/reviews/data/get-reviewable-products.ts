import { cacheLife, cacheTag } from "next/cache";

import { prisma, notDeleted } from "@/shared/lib/prisma";
import { getSession } from "@/modules/auth/lib/get-current-session";

import { REVIEWS_CACHE_TAGS } from "../constants/cache";
import type { ReviewableProduct } from "../types/review.types";

/**
 * Recupere les produits que l'utilisateur peut evaluer
 * = Produits commandes et livres, sans avis existant
 *
 * Pattern wrapper: la fonction publique recupere la session (cookies)
 * puis delegue a une fonction interne avec cache
 */
export async function getReviewableProducts(): Promise<ReviewableProduct[]> {
	const session = await getSession();
	if (!session?.user?.id) {
		return [];
	}

	return fetchReviewableProducts(session.user.id);
}

/**
 * Fonction interne avec cache
 * Separee pour eviter l'incompatibilite cookies/headers avec "use cache"
 */
async function fetchReviewableProducts(
	userId: string
): Promise<ReviewableProduct[]> {
	"use cache";
	cacheLife("session");
	cacheTag(REVIEWS_CACHE_TAGS.REVIEWABLE(userId));

	// Trouver les OrderItems livres sans avis
	const orderItems = await prisma.orderItem.findMany({
		where: {
			order: {
				userId,
				fulfillmentStatus: "DELIVERED",
				...notDeleted,
			},
			review: null,
		},
		include: {
			order: {
				select: {
					createdAt: true,
					actualDelivery: true,
				},
			},
			sku: {
				select: {
					product: {
						select: {
							id: true,
							title: true,
							slug: true,
							deletedAt: true,
							skus: {
								where: { isDefault: true },
								take: 1,
								select: {
									images: {
										where: { isPrimary: true },
										take: 1,
										select: {
											url: true,
											blurDataUrl: true,
											altText: true,
										},
									},
								},
							},
						},
					},
				},
			},
		},
		orderBy: {
			order: { actualDelivery: "desc" },
		},
	});

	// Dedupliquer par productId (un user peut avoir commande plusieurs fois le meme produit)
	const seenProductIds = new Set<string>();
	const reviewableProducts: ReviewableProduct[] = [];

	for (const item of orderItems) {
		// Verifier que le produit n'est pas soft-deleted
		if (!item.sku?.product || item.sku.product.deletedAt) {
			continue;
		}

		const productId = item.sku.product.id;

		if (seenProductIds.has(productId)) {
			continue;
		}
		seenProductIds.add(productId);

		// Verifier qu'il n'a pas deja un avis sur ce produit
		const existingReview = await prisma.productReview.findUnique({
			where: {
				userId_productId: { userId, productId },
			},
			select: { id: true },
		});

		if (existingReview) {
			continue;
		}

		const primaryImage = item.sku.product.skus[0]?.images[0] ?? null;

		reviewableProducts.push({
			productId: item.sku.product.id,
			productTitle: item.sku.product.title,
			productSlug: item.sku.product.slug,
			productImage: primaryImage,
			orderItemId: item.id,
			orderedAt: item.order.createdAt,
			deliveredAt: item.order.actualDelivery,
		});
	}

	return reviewableProducts;
}
