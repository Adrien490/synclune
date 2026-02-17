import { PaymentStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { cacheDashboard } from "@/modules/dashboard/constants/cache";

import type { GetKpisReturn } from "../types/dashboard.types";

// Re-export pour compatibilité
export type { GetKpisReturn } from "../types/dashboard.types";

// ============================================================================
// INTERNAL FETCH FUNCTIONS
// ============================================================================

async function fetchMonthlyRevenue() {
	const now = new Date();
	const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
	const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
	const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

	const [currentMonthOrders, lastMonthOrders] = await Promise.all([
		prisma.order.aggregate({
			where: {
				paidAt: { gte: currentMonthStart },
				paymentStatus: PaymentStatus.PAID,
				deletedAt: null,
			},
			_sum: { total: true },
		}),
		prisma.order.aggregate({
			where: {
				paidAt: { gte: lastMonthStart, lte: lastMonthEnd },
				paymentStatus: PaymentStatus.PAID,
				deletedAt: null,
			},
			_sum: { total: true },
		}),
	]);

	const currentAmount = currentMonthOrders._sum.total || 0;
	const lastAmount = lastMonthOrders._sum.total || 0;
	const evolution =
		lastAmount > 0 ? ((currentAmount - lastAmount) / lastAmount) * 100 : 0;

	return { amount: currentAmount, evolution };
}

async function fetchMonthlyOrders() {
	const now = new Date();
	const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
	const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
	const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

	const [currentMonthCount, lastMonthCount] = await Promise.all([
		prisma.order.count({
			where: {
				paidAt: { gte: currentMonthStart },
				paymentStatus: PaymentStatus.PAID,
				deletedAt: null,
			},
		}),
		prisma.order.count({
			where: {
				paidAt: { gte: lastMonthStart, lte: lastMonthEnd },
				paymentStatus: PaymentStatus.PAID,
				deletedAt: null,
			},
		}),
	]);

	const evolution =
		lastMonthCount > 0
			? ((currentMonthCount - lastMonthCount) / lastMonthCount) * 100
			: 0;

	return { count: currentMonthCount, evolution };
}

async function fetchAverageOrderValue() {
	const now = new Date();
	const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
	const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
	const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

	const [currentMonth, lastMonth] = await Promise.all([
		prisma.order.aggregate({
			where: {
				paidAt: { gte: currentMonthStart },
				paymentStatus: PaymentStatus.PAID,
				deletedAt: null,
			},
			_sum: { total: true },
			_count: true,
		}),
		prisma.order.aggregate({
			where: {
				paidAt: { gte: lastMonthStart, lte: lastMonthEnd },
				paymentStatus: PaymentStatus.PAID,
				deletedAt: null,
			},
			_sum: { total: true },
			_count: true,
		}),
	]);

	const currentAmount =
		currentMonth._count > 0
			? (currentMonth._sum.total || 0) / currentMonth._count
			: 0;
	const lastAmount =
		lastMonth._count > 0 ? (lastMonth._sum.total || 0) / lastMonth._count : 0;
	const evolution =
		lastAmount > 0 ? ((currentAmount - lastAmount) / lastAmount) * 100 : 0;

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

	cacheDashboard("dashboard-kpis");

	const [monthlyRevenue, monthlyOrders, averageOrderValue] = await Promise.all(
		[fetchMonthlyRevenue(), fetchMonthlyOrders(), fetchAverageOrderValue()],
	);

	return {
		monthlyRevenue,
		monthlyOrders,
		averageOrderValue,
	};
}
