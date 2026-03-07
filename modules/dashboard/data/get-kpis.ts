import { PaymentStatus } from "@/app/generated/prisma/client";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { cacheDefault } from "@/shared/lib/cache";
import { DASHBOARD_CACHE_TAGS } from "@/modules/dashboard/constants/cache";

import type { GetKpisReturn } from "../types/dashboard.types";

// Re-export pour compatibilité
export type { GetKpisReturn } from "../types/dashboard.types";

// ============================================================================
// HELPERS
// ============================================================================

function getMonthBoundaries() {
	const now = new Date();
	const year = now.getUTCFullYear();
	const month = now.getUTCMonth();

	return {
		currentMonthStart: new Date(Date.UTC(year, month, 1)),
		lastMonthStart: new Date(Date.UTC(year, month - 1, 1)),
		lastMonthEnd: new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)),
	};
}

function computeEvolution(current: number, previous: number): number {
	return previous > 0 ? ((current - previous) / previous) * 100 : 0;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Fetches the 3 essential dashboard KPIs with cache
 * Consolidated: 2 aggregate queries instead of 6
 */
export async function fetchDashboardKpis(): Promise<GetKpisReturn> {
	"use cache: remote";

	cacheDefault(DASHBOARD_CACHE_TAGS.KPIS);

	const { currentMonthStart, lastMonthStart, lastMonthEnd } = getMonthBoundaries();

	const [currentMonth, lastMonth] = await Promise.all([
		prisma.order.aggregate({
			where: {
				paidAt: { gte: currentMonthStart },
				paymentStatus: PaymentStatus.PAID,
				...notDeleted,
			},
			_sum: { total: true },
			_count: true,
		}),
		prisma.order.aggregate({
			where: {
				paidAt: { gte: lastMonthStart, lte: lastMonthEnd },
				paymentStatus: PaymentStatus.PAID,
				...notDeleted,
			},
			_sum: { total: true },
			_count: true,
		}),
	]);

	const currentRevenue = currentMonth._sum.total ?? 0;
	const lastRevenue = lastMonth._sum.total ?? 0;

	const currentCount = currentMonth._count;
	const lastCount = lastMonth._count;

	const currentAov = currentCount > 0 ? currentRevenue / currentCount : 0;
	const lastAov = lastCount > 0 ? lastRevenue / lastCount : 0;

	return {
		monthlyRevenue: {
			amount: currentRevenue,
			evolution: computeEvolution(currentRevenue, lastRevenue),
		},
		monthlyOrders: {
			count: currentCount,
			evolution: computeEvolution(currentCount, lastCount),
		},
		averageOrderValue: {
			amount: currentAov,
			evolution: computeEvolution(currentAov, lastAov),
		},
	};
}
