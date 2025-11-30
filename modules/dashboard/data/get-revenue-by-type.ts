import { PaymentStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { cacheDashboardRevenueByType } from "../constants/cache";
import type { GetRevenueByTypeReturn } from "../types/dashboard.types";
import {
	resolvePeriodToDates,
	type DashboardPeriod,
} from "../utils/period-resolver";

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Calcule les revenus par type de produit pour une periode donnee
 */
export async function fetchRevenueByType(
	period: DashboardPeriod,
	customStartDate?: Date,
	customEndDate?: Date
): Promise<GetRevenueByTypeReturn> {
	"use cache: remote";

	cacheDashboardRevenueByType(period);

	const { startDate, endDate } = resolvePeriodToDates(
		period,
		customStartDate,
		customEndDate
	);

	// Recuperer les OrderItems avec leurs produits et types
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
					type: {
						select: {
							id: true,
							label: true,
							slug: true,
						},
					},
				},
			},
		},
	});

	// Agreger par type de produit
	const typeMap = new Map<
		string,
		{
			typeId: string;
			typeLabel: string;
			typeSlug: string;
			revenue: number;
			orderIds: Set<string>;
			unitsSold: number;
		}
	>();

	let totalRevenue = 0;
	let uncategorizedRevenue = 0;

	for (const item of orderItems) {
		const itemRevenue = item.price * item.quantity;
		totalRevenue += itemRevenue;

		const productType = item.product?.type;

		if (!productType) {
			// Produit sans type
			uncategorizedRevenue += itemRevenue;
			continue;
		}

		const existing = typeMap.get(productType.id);

		if (existing) {
			existing.revenue += itemRevenue;
			existing.orderIds.add(item.orderId);
			existing.unitsSold += item.quantity;
		} else {
			typeMap.set(productType.id, {
				typeId: productType.id,
				typeLabel: productType.label,
				typeSlug: productType.slug,
				revenue: itemRevenue,
				orderIds: new Set([item.orderId]),
				unitsSold: item.quantity,
			});
		}
	}

	// Convertir en tableau et trier par revenu decroissant
	const types = Array.from(typeMap.values())
		.map((t) => ({
			typeId: t.typeId,
			typeLabel: t.typeLabel,
			typeSlug: t.typeSlug,
			revenue: t.revenue,
			ordersCount: t.orderIds.size,
			unitsSold: t.unitsSold,
		}))
		.sort((a, b) => b.revenue - a.revenue);

	return {
		types,
		uncategorizedRevenue,
		totalRevenue,
	};
}
