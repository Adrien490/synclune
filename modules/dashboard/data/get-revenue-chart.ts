import * as Sentry from "@sentry/nextjs";
import { cacheTag } from "next/cache";
import { prisma } from "@/shared/lib/prisma";
import { PAID_REVENUE_STATUSES } from "@/modules/orders/constants/revenue-status.constants";
import { cacheDashboard } from "@/shared/lib/cache";
import { DASHBOARD_CACHE_TAGS } from "@/modules/dashboard/constants/cache";
import { ORDERS_CACHE_TAGS } from "@/modules/orders/constants/cache";
import type {
	ComparisonMode,
	DashboardPeriod,
} from "@/modules/dashboard/constants/period.constants";
import {
	DASHBOARD_PERIODS,
	DEFAULT_COMPARISON_MODE,
	DEFAULT_PERIOD,
} from "@/modules/dashboard/constants/period.constants";
import {
	getChartConfig,
	getPeriodBoundaries,
} from "@/modules/dashboard/services/period-boundaries.service";
import {
	buildRevenueMap,
	fillMissingDates,
	formatChartData,
} from "../services/revenue-chart-builder.service";

import type { GetRevenueChartReturn, RevenueRow } from "../types/dashboard.types";

// Re-export pour compatibilité
export type { GetRevenueChartReturn } from "../types/dashboard.types";

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Fetches revenue data for the selected period with DB-side aggregation and cache
 * Adapts granularity: daily for 7d/30d/month, weekly for quarter, monthly for year
 *
 * Cache strategy:
 *  - Shared tag `DASHBOARD_CACHE_TAGS.REVENUE_CHART` for global dashboard refresh
 *  - Per-granularity secondary tag (`revenue-chart-{granularity}`) allows targeted
 *    invalidation if ever a single granularity bucket needs pruning.
 */
export async function fetchDashboardRevenueChart(
	period: DashboardPeriod = DEFAULT_PERIOD,
	comparisonMode: ComparisonMode = DEFAULT_COMPARISON_MODE,
): Promise<GetRevenueChartReturn> {
	"use cache";

	cacheDashboard(DASHBOARD_CACHE_TAGS.REVENUE_CHART);
	cacheTag(ORDERS_CACHE_TAGS.LIST);

	const chartConfig = getChartConfig(period);
	cacheTag(`${DASHBOARD_CACHE_TAGS.REVENUE_CHART}-${chartConfig.granularity}`);

	return Sentry.startSpan(
		{
			name: "dashboard.fetchRevenueChart",
			op: "db.read",
			attributes: { period, comparisonMode },
		},
		async () => {
			const periodLabel = DASHBOARD_PERIODS[period].label;
			const boundaries = getPeriodBoundaries(period);
			const comparisonStart =
				comparisonMode === "yoy" ? boundaries.previousYearStart : boundaries.previousStart;
			const comparisonEnd =
				comparisonMode === "yoy" ? boundaries.previousYearEnd : boundaries.previousEnd;

			// Buckets en heure de Paris (ANALYTICS-AUDIT-005) : double conversion
			// timestamp(UTC) → timestamptz → wall-clock Paris avant TO_CHAR.
			// Statuts encaissés (ANALYTICS-AUDIT-001) : inclut PARTIALLY_REFUNDED /
			// REFUNDED via = ANY(...) sans cast ::text (préserve l'usage d'index, A-008).
			// La série de comparaison est bornée en haut (<= comparisonEnd) pour ne pas
			// déborder sur la période courante.
			const [revenueRows, comparisonRows] = await Promise.all([
				prisma.$queryRaw<RevenueRow[]>`
					SELECT
						TO_CHAR(("paidAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Paris', ${chartConfig.sqlDateFormat}) as date,
						COALESCE(SUM(total), 0) as revenue,
						COUNT(*) as orders,
						COALESCE(SUM(subtotal), 0) as subtotal,
						COALESCE(SUM("discountAmount"), 0) as discounts,
						COALESCE(SUM("shippingCost"), 0) as shipping
					FROM "Order"
					WHERE "paidAt" >= ${chartConfig.startDate}
						AND "paymentStatus" = ANY(${[...PAID_REVENUE_STATUSES]}::"PaymentStatus"[])
						AND "deletedAt" IS NULL
					GROUP BY date
					ORDER BY date ASC
				`,
				prisma.$queryRaw<RevenueRow[]>`
					SELECT
						TO_CHAR(("paidAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Paris', ${chartConfig.sqlDateFormat}) as date,
						COALESCE(SUM(total), 0) as revenue,
						COUNT(*) as orders,
						COALESCE(SUM(subtotal), 0) as subtotal,
						COALESCE(SUM("discountAmount"), 0) as discounts,
						COALESCE(SUM("shippingCost"), 0) as shipping
					FROM "Order"
					WHERE "paidAt" >= ${comparisonStart}
						AND "paidAt" <= ${comparisonEnd}
						AND "paymentStatus" = ANY(${[...PAID_REVENUE_STATUSES]}::"PaymentStatus"[])
						AND "deletedAt" IS NULL
					GROUP BY date
					ORDER BY date ASC
				`,
			]);

			const rawData = fillMissingDates(
				buildRevenueMap(revenueRows),
				chartConfig.startDate,
				chartConfig.pointCount,
				chartConfig.granularity,
			);
			const data = formatChartData(rawData, chartConfig.granularity);

			// Série de comparaison : même longueur (pointCount + granularité), alignée
			// par index ordinal de bucket (le i-ᵉ bucket comparé → i-ᵉ bucket courant).
			const comparisonData = fillMissingDates(
				buildRevenueMap(comparisonRows),
				comparisonStart,
				chartConfig.pointCount,
				chartConfig.granularity,
			);
			const hasComparison = comparisonData.some((point) => point.revenue > 0);
			if (hasComparison) {
				for (let i = 0; i < data.length; i++) {
					data[i]!.previousRevenue = comparisonData[i]?.revenue ?? 0;
				}
			}

			return {
				data,
				periodLabel,
				granularity: chartConfig.granularity,
				hasComparison,
			};
		},
	);
}
