import { prisma } from "@/shared/lib/prisma";
import { cacheDashboard } from "@/shared/lib/cache";
import { DASHBOARD_CACHE_TAGS } from "@/modules/dashboard/constants/cache";
import {
	DASHBOARD_PERIODS,
	DEFAULT_PERIOD,
	type DashboardPeriod,
} from "@/modules/dashboard/constants/period.constants";
import { getPeriodBoundaries } from "@/modules/dashboard/services/period-boundaries.service";
import {
	buildHeatmapCells,
	computeHeatmapStats,
} from "@/modules/dashboard/services/heatmap-builder.service";

import type { GetSalesHeatmapReturn, HeatmapRawRow } from "../types/dashboard.types";

export type { GetSalesHeatmapReturn } from "../types/dashboard.types";

/**
 * Aggregates paid orders into a 7×24 (day-of-week × hour) grid.
 * Useful to identify peak shopping windows for marketing/email scheduling.
 */
export async function fetchSalesHeatmap(
	period: DashboardPeriod = DEFAULT_PERIOD,
): Promise<GetSalesHeatmapReturn> {
	"use cache";

	cacheDashboard(DASHBOARD_CACHE_TAGS.SALES_HEATMAP);

	const { currentStart } = getPeriodBoundaries(period);

	const rows = await prisma.$queryRaw<HeatmapRawRow[]>`
		SELECT
			EXTRACT(DOW FROM "paidAt")::int AS dow,
			EXTRACT(HOUR FROM "paidAt")::int AS hour,
			COUNT(*)::bigint AS count,
			COALESCE(SUM("total"), 0)::bigint AS revenue
		FROM "Order"
		WHERE "paymentStatus" = 'PAID'
			AND "paidAt" >= ${currentStart}
			AND "deletedAt" IS NULL
		GROUP BY dow, hour
	`;

	const cells = buildHeatmapCells(rows);
	const stats = computeHeatmapStats(cells);

	return {
		cells,
		maxCount: stats.maxCount,
		totalOrders: stats.totalOrders,
		totalRevenue: stats.totalRevenue,
		periodLabel: DASHBOARD_PERIODS[period].label,
	};
}
