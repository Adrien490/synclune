import { PaymentStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { cacheDashboard, DASHBOARD_CACHE_TAGS } from "../constants/cache";
import type { SalesKpisReturn } from "../types/dashboard.types";
import {
	calculateEvolution,
	resolvePeriodToDates,
	type DashboardPeriod,
} from "../utils/period-resolver";

// ============================================================================
// INTERNAL FETCH FUNCTIONS
// ============================================================================

async function fetchRevenue(startDate: Date, endDate: Date) {
	const result = await prisma.order.aggregate({
		where: {
			paidAt: { gte: startDate, lte: endDate },
			paymentStatus: PaymentStatus.PAID,
			deletedAt: null,
		},
		_sum: { total: true },
	});
	return result._sum.total || 0;
}

async function fetchOrdersCount(startDate: Date, endDate: Date) {
	return prisma.order.count({
		where: {
			paidAt: { gte: startDate, lte: endDate },
			paymentStatus: PaymentStatus.PAID,
			deletedAt: null,
		},
	});
}

async function fetchAverageOrderValue(startDate: Date, endDate: Date) {
	const result = await prisma.order.aggregate({
		where: {
			paidAt: { gte: startDate, lte: endDate },
			paymentStatus: PaymentStatus.PAID,
			deletedAt: null,
		},
		_sum: { total: true },
		_count: true,
	});

	if (result._count === 0) return 0;
	return (result._sum.total || 0) / result._count;
}

async function fetchConversionRate(startDate: Date, endDate: Date) {
	const now = new Date();

	const [paidOrders, completedCarts] = await Promise.all([
		prisma.order.count({
			where: {
				paidAt: { gte: startDate, lte: endDate },
				paymentStatus: PaymentStatus.PAID,
				deletedAt: null,
			},
		}),
		// On ne compte que les paniers qui ont eu le temps de se decider
		// (expires ou convertis), pas les paniers actifs
		prisma.cart.count({
			where: {
				createdAt: { gte: startDate, lte: endDate },
				OR: [
					{ expiresAt: { lt: now } }, // Paniers expires
					{ expiresAt: null }, // Paniers sans expiration (rares)
				],
			},
		}),
	]);

	// Si aucun panier n'a complete son cycle, on ne peut pas calculer
	if (completedCarts === 0) return 0;
	return (paidOrders / completedCarts) * 100;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Recupere les KPIs de la section Ventes pour une periode donnee
 */
export async function fetchSalesKpis(
	period: DashboardPeriod,
	customStartDate?: Date,
	customEndDate?: Date
): Promise<SalesKpisReturn> {
	"use cache";

	cacheDashboard(DASHBOARD_CACHE_TAGS.SALES_KPIS(period));

	const { startDate, endDate, previousStartDate, previousEndDate } =
		resolvePeriodToDates(period, customStartDate, customEndDate);

	// Fetch current period data
	const [currentRevenue, currentOrders, currentAOV, currentConversion] =
		await Promise.all([
			fetchRevenue(startDate, endDate),
			fetchOrdersCount(startDate, endDate),
			fetchAverageOrderValue(startDate, endDate),
			fetchConversionRate(startDate, endDate),
		]);

	// Fetch previous period data for evolution
	const [previousRevenue, previousOrders, previousAOV, previousConversion] =
		await Promise.all([
			fetchRevenue(previousStartDate, previousEndDate),
			fetchOrdersCount(previousStartDate, previousEndDate),
			fetchAverageOrderValue(previousStartDate, previousEndDate),
			fetchConversionRate(previousStartDate, previousEndDate),
		]);

	return {
		revenue: {
			amount: currentRevenue,
			evolution: calculateEvolution(currentRevenue, previousRevenue),
		},
		ordersCount: {
			count: currentOrders,
			evolution: calculateEvolution(currentOrders, previousOrders),
		},
		averageOrderValue: {
			amount: currentAOV,
			evolution: calculateEvolution(currentAOV, previousAOV),
		},
		conversionRate: {
			rate: currentConversion,
			evolution: calculateEvolution(currentConversion, previousConversion),
		},
	};
}
