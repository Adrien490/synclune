import { PaymentStatus } from "@/app/generated/prisma/client";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { cacheDashboard, DASHBOARD_CACHE_TAGS } from "@/modules/dashboard/constants/cache";

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

// ============================================================================
// INTERNAL FETCH FUNCTIONS
// ============================================================================

async function fetchMonthlyRevenue() {
	const { currentMonthStart, lastMonthStart, lastMonthEnd } = getMonthBoundaries();

	const [currentMonthOrders, lastMonthOrders] = await Promise.all([
		prisma.order.aggregate({
			where: {
				paidAt: { gte: currentMonthStart },
				paymentStatus: PaymentStatus.PAID,
				...notDeleted,
			},
			_sum: { total: true },
		}),
		prisma.order.aggregate({
			where: {
				paidAt: { gte: lastMonthStart, lte: lastMonthEnd },
				paymentStatus: PaymentStatus.PAID,
				...notDeleted,
			},
			_sum: { total: true },
		}),
	]);

	const currentAmount = currentMonthOrders._sum.total ?? 0;
	const lastAmount = lastMonthOrders._sum.total ?? 0;
	const evolution = lastAmount > 0 ? ((currentAmount - lastAmount) / lastAmount) * 100 : 0;

	return { amount: currentAmount, evolution };
}

async function fetchMonthlyOrders() {
	const { currentMonthStart, lastMonthStart, lastMonthEnd } = getMonthBoundaries();

	const [currentMonthCount, lastMonthCount] = await Promise.all([
		prisma.order.count({
			where: {
				paidAt: { gte: currentMonthStart },
				paymentStatus: PaymentStatus.PAID,
				...notDeleted,
			},
		}),
		prisma.order.count({
			where: {
				paidAt: { gte: lastMonthStart, lte: lastMonthEnd },
				paymentStatus: PaymentStatus.PAID,
				...notDeleted,
			},
		}),
	]);

	const evolution =
		lastMonthCount > 0 ? ((currentMonthCount - lastMonthCount) / lastMonthCount) * 100 : 0;

	return { count: currentMonthCount, evolution };
}

async function fetchAverageOrderValue() {
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

	const currentAmount =
		currentMonth._count > 0 ? (currentMonth._sum.total ?? 0) / currentMonth._count : 0;
	const lastAmount = lastMonth._count > 0 ? (lastMonth._sum.total ?? 0) / lastMonth._count : 0;
	const evolution = lastAmount > 0 ? ((currentAmount - lastAmount) / lastAmount) * 100 : 0;

	return { amount: currentAmount, evolution };
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Fetches the 3 essential dashboard KPIs with cache
 */
export async function fetchDashboardKpis(): Promise<GetKpisReturn> {
	"use cache: remote";

	cacheDashboard(DASHBOARD_CACHE_TAGS.KPIS);

	const [monthlyRevenue, monthlyOrders, averageOrderValue] = await Promise.all([
		fetchMonthlyRevenue(),
		fetchMonthlyOrders(),
		fetchAverageOrderValue(),
	]);

	return {
		monthlyRevenue,
		monthlyOrders,
		averageOrderValue,
	};
}
