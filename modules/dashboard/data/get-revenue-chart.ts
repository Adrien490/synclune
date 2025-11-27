import { isAdmin } from "@/modules/auth/utils/guards";
import { PaymentStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { cacheDashboard } from "@/modules/dashboard/constants/cache";

import type {
	RevenueDataPoint,
	GetRevenueChartReturn,
} from "../types/dashboard.types";

// Re-export pour compatibilité
export type {
	RevenueDataPoint,
	GetRevenueChartReturn,
} from "../types/dashboard.types";

// Alias pour compatibilité avec les imports existants
export type GetDashboardRevenueChartReturn = GetRevenueChartReturn;

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Action serveur pour récupérer les données de revenus des 30 derniers jours
 */
export async function getRevenueChart(): Promise<GetRevenueChartReturn> {
	const admin = await isAdmin();

	if (!admin) {
		throw new Error("Admin access required");
	}

	return await fetchDashboardRevenueChart();
}

/**
 * Récupère les données de revenus des 30 derniers jours depuis la DB avec cache
 */
export async function fetchDashboardRevenueChart(): Promise<GetRevenueChartReturn> {
	"use cache: remote";

	cacheDashboard();

	const now = new Date();
	const thirtyDaysAgo = new Date(now);
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
	thirtyDaysAgo.setHours(0, 0, 0, 0);

	const orders = await prisma.order.findMany({
		where: {
			createdAt: { gte: thirtyDaysAgo },
			paymentStatus: PaymentStatus.PAID,
		},
		select: {
			createdAt: true,
			total: true,
		},
		orderBy: {
			createdAt: "asc",
		},
	});

	const revenueByDay = new Map<string, number>();

	for (let i = 0; i < 30; i++) {
		const date = new Date(thirtyDaysAgo);
		date.setDate(date.getDate() + i);
		const dateKey = date.toISOString().split("T")[0];
		revenueByDay.set(dateKey, 0);
	}

	orders.forEach((order) => {
		const dateKey = order.createdAt.toISOString().split("T")[0];
		const existing = revenueByDay.get(dateKey) || 0;
		revenueByDay.set(dateKey, existing + order.total);
	});

	const data = Array.from(revenueByDay.entries())
		.sort((a, b) => a[0].localeCompare(b[0]))
		.map(([date, revenue]) => ({
			date,
			revenue,
		}));

	return { data };
}
