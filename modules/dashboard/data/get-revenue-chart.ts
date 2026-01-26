import { prisma } from "@/shared/lib/prisma";
import { cacheDashboard } from "@/modules/dashboard/constants/cache";
import {
	buildRevenueMap,
	fillMissingDates,
} from "../services/revenue-chart-builder.service";

import type {
	RevenueDataPoint,
	GetRevenueChartReturn,
} from "../types/dashboard.types";

// Re-export pour compatibilité
export type {
	RevenueDataPoint,
	GetRevenueChartReturn,
} from "../types/dashboard.types";

// ============================================================================
// MAIN FUNCTION
// ============================================================================

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

	// Transformer les résultats en série temporelle continue
	const revenueMap = buildRevenueMap(revenueRows);
	const data = fillMissingDates(revenueMap, thirtyDaysAgo, 30);

	return { data };
}
