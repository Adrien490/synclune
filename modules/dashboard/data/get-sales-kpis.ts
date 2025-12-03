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
			createdAt: { gte: startDate, lte: endDate },
			paymentStatus: PaymentStatus.PAID,
		},
		_sum: { total: true },
	});
	return result._sum.total || 0;
}

async function fetchOrdersCount(startDate: Date, endDate: Date) {
	return prisma.order.count({
		where: {
			createdAt: { gte: startDate, lte: endDate },
			paymentStatus: PaymentStatus.PAID,
		},
	});
}

async function fetchAverageOrderValue(startDate: Date, endDate: Date) {
	const result = await prisma.order.aggregate({
		where: {
			createdAt: { gte: startDate, lte: endDate },
			paymentStatus: PaymentStatus.PAID,
		},
		_sum: { total: true },
		_count: true,
	});

	if (result._count === 0) return 0;
	return (result._sum.total || 0) / result._count;
}

async function fetchConversionRate(startDate: Date, endDate: Date) {
	const [paidOrders, totalCarts] = await Promise.all([
		prisma.order.count({
			where: {
				createdAt: { gte: startDate, lte: endDate },
				paymentStatus: PaymentStatus.PAID,
			},
		}),
		prisma.cart.count({
			where: {
				createdAt: { gte: startDate, lte: endDate },
			},
		}),
	]);

	if (totalCarts === 0) return 0;
	return (paidOrders / totalCarts) * 100;
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
	"use cache: remote";

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
