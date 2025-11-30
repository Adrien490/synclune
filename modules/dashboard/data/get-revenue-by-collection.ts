import { PaymentStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { cacheDashboardRevenueByCollection } from "../constants/cache";
import type { GetRevenueByCollectionReturn } from "../types/dashboard.types";
import {
	resolvePeriodToDates,
	type DashboardPeriod,
} from "../utils/period-resolver";

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Calcule les revenus par collection pour une periode donnee
 */
export async function fetchRevenueByCollection(
	period: DashboardPeriod,
	customStartDate?: Date,
	customEndDate?: Date
): Promise<GetRevenueByCollectionReturn> {
	"use cache: remote";

	cacheDashboardRevenueByCollection(period);

	const { startDate, endDate } = resolvePeriodToDates(
		period,
		customStartDate,
		customEndDate
	);

	// Recuperer les OrderItems avec leurs produits et collections
	const orderItems = await prisma.orderItem.findMany({
		where: {
			order: {
				paymentStatus: PaymentStatus.PAID,
				createdAt: { gte: startDate, lte: endDate },
			},
			productId: { not: null },
		},
		select: {
			price: true,
			quantity: true,
			orderId: true,
			product: {
				select: {
					collections: {
						select: {
							collection: {
								select: {
									id: true,
									name: true,
									slug: true,
								},
							},
						},
					},
				},
			},
		},
	});

	// Agreger par collection
	const collectionMap = new Map<
		string,
		{
			collectionId: string;
			collectionName: string;
			collectionSlug: string;
			revenue: number;
			orderIds: Set<string>;
			unitsSold: number;
		}
	>();

	let totalRevenue = 0;

	for (const item of orderItems) {
		const itemRevenue = item.price * item.quantity;
		totalRevenue += itemRevenue;

		// Un produit peut appartenir a plusieurs collections
		const collections = item.product?.collections || [];

		if (collections.length === 0) {
			// Produit sans collection - ignorer ou ajouter a "Non classe"
			continue;
		}

		// Repartir le revenu entre les collections du produit
		// (ou attribuer 100% a chaque collection si on veut compter les appartenances multiples)
		for (const pc of collections) {
			const collection = pc.collection;
			const existing = collectionMap.get(collection.id);

			if (existing) {
				existing.revenue += itemRevenue;
				existing.orderIds.add(item.orderId);
				existing.unitsSold += item.quantity;
			} else {
				collectionMap.set(collection.id, {
					collectionId: collection.id,
					collectionName: collection.name,
					collectionSlug: collection.slug,
					revenue: itemRevenue,
					orderIds: new Set([item.orderId]),
					unitsSold: item.quantity,
				});
			}
		}
	}

	// Convertir en tableau et trier par revenu decroissant
	const collections = Array.from(collectionMap.values())
		.map((c) => ({
			collectionId: c.collectionId,
			collectionName: c.collectionName,
			collectionSlug: c.collectionSlug,
			revenue: c.revenue,
			ordersCount: c.orderIds.size,
			unitsSold: c.unitsSold,
		}))
		.sort((a, b) => b.revenue - a.revenue);

	return {
		collections,
		totalRevenue,
	};
}
