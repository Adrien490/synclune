import { prisma, notDeleted } from "@/shared/lib/prisma";
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

	try {
		return await prisma.order.findUnique({
			where: { id: orderId, ...notDeleted },
			select: {
				id: true,
				orderNumber: true,
				userId: true,
				fulfillmentStatus: true,
				reviewRequestSentAt: true,
				user: {
					select: {
						id: true,
						name: true,
						email: true,
					},
				},
				items: {
					select: {
						id: true,
						skuId: true,
						productTitle: true,
						quantity: true,
						sku: {
							select: {
								id: true,
								size: true,
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
	} catch (error) {
		console.error("[getOrderForReviewRequest]", error);
		return null;
	}
}
