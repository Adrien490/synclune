import { isAdmin } from "@/modules/auth/utils/guards";
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

// Type pour le résultat de la requête SQL
type RevenueRow = {
	date: string;
	revenue: bigint;
};

/**
 * Récupère les données de revenus des 30 derniers jours depuis la DB avec cache
 * Optimisé: agrégation côté DB via GROUP BY au lieu de traitement JS
 */
export async function fetchDashboardRevenueChart(): Promise<GetRevenueChartReturn> {
	"use cache: remote";

	cacheDashboard();

	const now = new Date();
	const thirtyDaysAgo = new Date(now);
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
	thirtyDaysAgo.setHours(0, 0, 0, 0);

	// Agregation cote DB - plus efficace que de recuperer tous les ordres
	const revenueRows = await prisma.$queryRaw<RevenueRow[]>`
		SELECT
			TO_CHAR("paidAt", 'YYYY-MM-DD') as date,
			COALESCE(SUM(total), 0) as revenue
		FROM "Order"
		WHERE "paidAt" >= ${thirtyDaysAgo}
			AND "paymentStatus" = 'PAID'::"PaymentStatus"
			AND "deletedAt" IS NULL
		GROUP BY TO_CHAR("paidAt", 'YYYY-MM-DD')
		ORDER BY date ASC
	`;

	// Créer un map avec les résultats DB
	const revenueMap = new Map<string, number>();
	for (const row of revenueRows) {
		revenueMap.set(row.date, Number(row.revenue));
	}

	// Remplir les jours sans revenus avec 0
	const data: RevenueDataPoint[] = [];
	for (let i = 0; i < 30; i++) {
		const date = new Date(thirtyDaysAgo);
		date.setDate(date.getDate() + i);
		const dateKey = date.toISOString().split("T")[0];
		data.push({
			date: dateKey,
			revenue: revenueMap.get(dateKey) || 0,
		});
	}

	return { data };
}
