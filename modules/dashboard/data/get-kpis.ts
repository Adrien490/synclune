import { isAdmin } from "@/modules/auth/utils/guards";
import { OrderStatus, PaymentStatus } from "@/app/generated/prisma/client";
import { cacheLife } from "next/cache";
import { prisma } from "@/shared/lib/prisma";
import { cacheDashboard } from "@/modules/dashboard/constants/cache";

import type { GetKpisReturn } from "../types/dashboard.types";

// Re-export pour compatibilité
export type { GetKpisReturn } from "../types/dashboard.types";

// Alias pour compatibilité avec les imports existants
export type GetDashboardKpisReturn = GetKpisReturn;

// ============================================================================
// INTERNAL FETCH FUNCTIONS
// ============================================================================

async function fetchTodayRevenue() {
	"use cache";
	cacheDashboard();

	const now = new Date();
	const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const yesterdayStart = new Date(todayStart);
	yesterdayStart.setDate(yesterdayStart.getDate() - 1);

	const [todayOrders, yesterdayOrders] = await Promise.all([
		prisma.order.aggregate({
			where: {
				createdAt: { gte: todayStart },
				paymentStatus: PaymentStatus.PAID,
			},
			_sum: { total: true },
		}),
		prisma.order.aggregate({
			where: {
				createdAt: { gte: yesterdayStart, lt: todayStart },
				paymentStatus: PaymentStatus.PAID,
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
	"use cache";
	cacheLife({ stale: 120, revalidate: 60, expire: 300 });

	const now = new Date();
	const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
	const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
	const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

	const [currentMonthOrders, lastMonthOrders] = await Promise.all([
		prisma.order.aggregate({
			where: {
				createdAt: { gte: currentMonthStart },
				paymentStatus: PaymentStatus.PAID,
			},
			_sum: { total: true },
		}),
		prisma.order.aggregate({
			where: {
				createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
				paymentStatus: PaymentStatus.PAID,
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
	"use cache";
	cacheLife({ stale: 120, revalidate: 60, expire: 300 });

	const now = new Date();
	const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
	const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
	const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

	const [currentMonthCount, lastMonthCount] = await Promise.all([
		prisma.order.count({
			where: {
				createdAt: { gte: currentMonthStart },
				paymentStatus: PaymentStatus.PAID,
			},
		}),
		prisma.order.count({
			where: {
				createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
				paymentStatus: PaymentStatus.PAID,
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
	"use cache";
	cacheLife({ stale: 120, revalidate: 60, expire: 300 });

	const now = new Date();
	const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
	const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
	const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

	const [currentMonth, lastMonth] = await Promise.all([
		prisma.order.aggregate({
			where: {
				createdAt: { gte: currentMonthStart },
				paymentStatus: PaymentStatus.PAID,
			},
			_sum: { total: true },
			_count: true,
		}),
		prisma.order.aggregate({
			where: {
				createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
				paymentStatus: PaymentStatus.PAID,
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
	"use cache";
	cacheLife({ stale: 120, revalidate: 60, expire: 300 });

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
	"use cache";
	cacheLife({ stale: 120, revalidate: 60, expire: 300 });

	const outOfStockProducts = await prisma.productSku.count({
		where: {
			isActive: true,
			inventory: 0,
		},
	});

	return { count: outOfStockProducts };
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Action serveur pour récupérer les KPIs du dashboard admin
 */
export async function getKpis(): Promise<GetKpisReturn> {
	const admin = await isAdmin();

	if (!admin) {
		throw new Error("Admin access required");
	}

	return await fetchDashboardKpis();
}

/**
 * Récupère les KPIs essentiels du dashboard avec cache
 */
export async function fetchDashboardKpis(): Promise<GetKpisReturn> {
	"use cache: remote";

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
