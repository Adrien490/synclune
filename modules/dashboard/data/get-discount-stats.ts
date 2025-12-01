import { isAdmin } from "@/modules/auth/utils/guards";
import { prisma } from "@/shared/lib/prisma";
import { cacheDashboardDiscountStats } from "../constants/cache";
import type { DiscountStatsReturn } from "../types/dashboard.types";
import {
	resolvePeriodToDates,
	type DashboardPeriod,
} from "../utils/period-resolver";

// Re-export pour compatibilite
export type { DiscountStatsReturn } from "../types/dashboard.types";

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Action serveur pour recuperer les statistiques des codes promo
 */
export async function getDiscountStats(
	period: DashboardPeriod,
	customStartDate?: Date,
	customEndDate?: Date
): Promise<DiscountStatsReturn> {
	const admin = await isAdmin();

	if (!admin) {
		throw new Error("Admin access required");
	}

	return await fetchDiscountStats(period, customStartDate, customEndDate);
}

/**
 * Recupere les statistiques des codes promo depuis la DB avec cache
 */
export async function fetchDiscountStats(
	period: DashboardPeriod,
	customStartDate?: Date,
	customEndDate?: Date
): Promise<DiscountStatsReturn> {
	"use cache: remote";

	cacheDashboardDiscountStats(period);

	const { startDate, endDate, previousStartDate, previousEndDate } =
		resolvePeriodToDates(period, customStartDate, customEndDate);

	// Periode actuelle
	const currentStats = await getDiscountStatsForPeriod(startDate, endDate);

	// Periode precedente
	const previousStats = await getDiscountStatsForPeriod(
		previousStartDate,
		previousEndDate
	);

	// Codes promo non utilises (actifs mais 0 usage)
	const unusedCodes = await prisma.discount.count({
		where: {
			isActive: true,
			usageCount: 0,
		},
	});

	// Calcul des evolutions
	const revenueEvolution =
		previousStats.revenueWithDiscount > 0
			? ((currentStats.revenueWithDiscount - previousStats.revenueWithDiscount) /
					previousStats.revenueWithDiscount) *
				100
			: 0;

	const discountEvolution =
		previousStats.totalDiscountAmount > 0
			? ((currentStats.totalDiscountAmount - previousStats.totalDiscountAmount) /
					previousStats.totalDiscountAmount) *
				100
			: 0;

	const ordersEvolution =
		previousStats.ordersCount > 0
			? ((currentStats.ordersCount - previousStats.ordersCount) /
					previousStats.ordersCount) *
				100
			: 0;

	return {
		revenueWithDiscount: {
			amount: Math.round(currentStats.revenueWithDiscount * 100) / 100,
			evolution: Math.round(revenueEvolution * 100) / 100,
		},
		totalDiscountAmount: {
			amount: Math.round(currentStats.totalDiscountAmount * 100) / 100,
			evolution: Math.round(discountEvolution * 100) / 100,
		},
		ordersWithDiscount: {
			count: currentStats.ordersCount,
			evolution: Math.round(ordersEvolution * 100) / 100,
		},
		unusedCodes: {
			count: unusedCodes,
		},
	};
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function getDiscountStatsForPeriod(
	startDate: Date,
	endDate: Date
): Promise<{
	revenueWithDiscount: number;
	totalDiscountAmount: number;
	ordersCount: number;
}> {
	const result = await prisma.order.aggregate({
		where: {
			paymentStatus: "PAID",
			paidAt: {
				gte: startDate,
				lte: endDate,
			},
			discountAmount: {
				gt: 0,
			},
		},
		_sum: {
			total: true,
			discountAmount: true,
		},
		_count: {
			id: true,
		},
	});

	return {
		revenueWithDiscount: (result._sum.total || 0) / 100,
		totalDiscountAmount: (result._sum.discountAmount || 0) / 100,
		ordersCount: result._count.id,
	};
}
