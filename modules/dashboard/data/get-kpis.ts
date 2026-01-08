import { OrderStatus, PaymentStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { cacheDashboard } from "@/modules/dashboard/constants/cache";

import type { GetKpisReturn } from "../types/dashboard.types";

// Re-export pour compatibilité
export type { GetKpisReturn } from "../types/dashboard.types";

// ============================================================================
// INTERNAL FETCH FUNCTIONS
// ============================================================================

async function fetchTodayRevenue() {
	const now = new Date();
	const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const yesterdayStart = new Date(todayStart);
	yesterdayStart.setDate(yesterdayStart.getDate() - 1);

	// Pour une comparaison equitable, on compare la meme tranche horaire
	// Today: de minuit a maintenant vs Yesterday: de minuit a la meme heure hier
	const yesterdaySameTime = new Date(yesterdayStart);
	yesterdaySameTime.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

	const [todayOrders, yesterdayOrders] = await Promise.all([
		prisma.order.aggregate({
			where: {
				paidAt: { gte: todayStart },
				paymentStatus: PaymentStatus.PAID,
				deletedAt: null,
			},
			_sum: { total: true },
		}),
		prisma.order.aggregate({
			where: {
				paidAt: { gte: yesterdayStart, lt: yesterdaySameTime },
				paymentStatus: PaymentStatus.PAID,
				deletedAt: null,
			},
			_sum: { total: true },
		}),
	]);

	const todayAmount = todayOrders._sum.total || 0;
	const yesterdayAmount = yesterdayOrders._sum.total || 0;
	const evolution =
		yesterdayAmount > 0
			? ((todayAmount - yesterdayAmount) / yesterdayAmount) * 100
			: 0;

	return { amount: todayAmount, evolution };
}

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

async function fetchPendingOrders() {
	const now = new Date();
	const twoDaysAgo = new Date(now);
	twoDaysAgo.setHours(now.getHours() - 48);

	const [pendingOrders, urgentOrders] = await Promise.all([
		prisma.order.count({
			where: {
				status: OrderStatus.PROCESSING,
			},
		}),
		prisma.order.count({
			where: {
				status: OrderStatus.PROCESSING,
				createdAt: { lt: twoDaysAgo },
			},
		}),
	]);

	return { count: pendingOrders, urgentCount: urgentOrders };
}

async function fetchOutOfStockProducts() {
	const outOfStockProducts = await prisma.productSku.count({
		where: {
			isActive: true,
			inventory: 0,
		},
	});

	return { count: outOfStockProducts };
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Récupère les KPIs essentiels du dashboard avec cache
 */
export async function fetchDashboardKpis(): Promise<GetKpisReturn> {
	"use cache";

	cacheDashboard();

	const [
		todayRevenue,
		monthlyRevenue,
		monthlyOrders,
		averageOrderValue,
		pendingOrders,
		outOfStock,
	] = await Promise.all([
		fetchTodayRevenue(),
		fetchMonthlyRevenue(),
		fetchMonthlyOrders(),
		fetchAverageOrderValue(),
		fetchPendingOrders(),
		fetchOutOfStockProducts(),
	]);

	return {
		todayRevenue,
		monthlyRevenue,
		monthlyOrders,
		averageOrderValue,
		pendingOrders,
		outOfStock,
	};
}
