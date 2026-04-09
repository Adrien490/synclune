import { PaymentStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { cacheDashboard } from "@/shared/lib/cache";
import { DASHBOARD_CACHE_TAGS } from "@/modules/dashboard/constants/cache";
import type { DashboardPeriod } from "@/modules/dashboard/constants/period.constants";
import { DASHBOARD_PERIODS, DEFAULT_PERIOD } from "@/modules/dashboard/constants/period.constants";
import { getChartConfig } from "@/modules/dashboard/services/period-boundaries.service";
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
 */
export async function fetchDashboardRevenueChart(
	period: DashboardPeriod = DEFAULT_PERIOD,
): Promise<GetRevenueChartReturn> {
	"use cache";

	cacheDashboard(DASHBOARD_CACHE_TAGS.REVENUE_CHART);

	const chartConfig = getChartConfig(period);
	const periodLabel = DASHBOARD_PERIODS[period].label;

	// Agregation cote DB with dynamic date format based on granularity
	const revenueRows = await prisma.$queryRaw<RevenueRow[]>`
		SELECT
			TO_CHAR("paidAt" AT TIME ZONE 'UTC', ${chartConfig.sqlDateFormat}) as date,
			COALESCE(SUM(total), 0) as revenue,
			COUNT(*) as orders,
			COALESCE(SUM(subtotal), 0) as subtotal,
			COALESCE(SUM("discountAmount"), 0) as discounts,
			COALESCE(SUM("shippingCost"), 0) as shipping
		FROM "Order"
		WHERE "paidAt" >= ${chartConfig.startDate}
			AND "paymentStatus"::text = ${PaymentStatus.PAID}
			AND "deletedAt" IS NULL
		GROUP BY TO_CHAR("paidAt" AT TIME ZONE 'UTC', ${chartConfig.sqlDateFormat})
		ORDER BY date ASC
	`;

	// Transform into continuous time series with French labels
	const maps = buildRevenueMap(revenueRows);
	const rawData = fillMissingDates(
		maps,
		chartConfig.startDate,
		chartConfig.pointCount,
		chartConfig.granularity,
	);
	const data = formatChartData(rawData, chartConfig.granularity);

	return { data, periodLabel };
}
