import { prisma } from "@/shared/lib/prisma";
import { cacheReviewsAdmin } from "../constants/cache";

// ============================================================================
// TYPES
// ============================================================================

export type OrderForReviewRequest = Awaited<ReturnType<typeof fetchOrderForReviewRequest>>;

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Récupère une commande avec les données nécessaires pour l'email de demande d'avis
 *
 * Inclut: user (email, name), items avec SKU (product, color, material, images), reviews existantes
 * Utilisé par send-review-request-email.ts
 *
 * @param orderId - ID de la commande
 */
export async function getOrderForReviewRequest(
	orderId: string
): Promise<OrderForReviewRequest> {
	return fetchOrderForReviewRequest(orderId);
}

// ============================================================================
// FETCH FUNCTION (CACHED)
// ============================================================================

async function fetchOrderForReviewRequest(orderId: string) {
	"use cache";

	cacheReviewsAdmin();

	return prisma.order.findUnique({
		where: { id: orderId },
		include: {
			user: {
				select: {
					id: true,
					name: true,
					email: true,
				},
			},
			items: {
				include: {
					sku: {
						include: {
							product: {
								select: {
									id: true,
									title: true,
									slug: true,
								},
							},
							color: {
								select: { name: true },
							},
							material: {
								select: { name: true },
							},
							images: {
								where: { isPrimary: true },
								take: 1,
								select: { url: true },
							},
						},
					},
					review: {
						select: { id: true },
					},
				},
			},
		},
	});
}
