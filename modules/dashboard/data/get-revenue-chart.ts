import { PaymentStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { cacheDashboard } from "@/shared/lib/cache";
import { DASHBOARD_CACHE_TAGS } from "@/modules/dashboard/constants/cache";
import {
	buildRevenueMap,
	fillMissingDates,
	formatChartData,
} from "../services/revenue-chart-builder.service";

import type { GetRevenueChartReturn, RevenueRow } from "../types/dashboard.types";

// Re-export pour compatibilité
export type { RevenueDataPoint, GetRevenueChartReturn } from "../types/dashboard.types";

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Récupère les données de revenus des 30 derniers jours depuis la DB avec cache
 * Optimisé: agrégation côté DB via GROUP BY au lieu de traitement JS
 * Les dates sont pre-formatees en labels FR pour eviter date-fns cote client
 */
export async function fetchDashboardRevenueChart(): Promise<GetRevenueChartReturn> {
	"use cache";

	cacheDashboard(DASHBOARD_CACHE_TAGS.REVENUE_CHART);

	const now = new Date();
	const thirtyDaysAgo = new Date(
		Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 30),
	);

	// Agregation cote DB - plus efficace que de recuperer tous les ordres
	const revenueRows = await prisma.$queryRaw<RevenueRow[]>`
		SELECT
			TO_CHAR("paidAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD') as date,
			COALESCE(SUM(total), 0) as revenue,
			COUNT(*) as orders,
			COALESCE(SUM(subtotal), 0) as subtotal,
			COALESCE(SUM("discountAmount"), 0) as discounts,
			COALESCE(SUM("shippingCost"), 0) as shipping
		FROM "Order"
		WHERE "paidAt" >= ${thirtyDaysAgo}
			AND "paymentStatus"::text = ${PaymentStatus.PAID}
			AND "deletedAt" IS NULL
		GROUP BY TO_CHAR("paidAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD')
		ORDER BY date ASC
	`;

	// Transformer les résultats en série temporelle continue avec labels FR
	const maps = buildRevenueMap(revenueRows);
	const rawData = fillMissingDates(maps, thirtyDaysAgo, 30);
	const data = formatChartData(rawData);

	return { data };
}
