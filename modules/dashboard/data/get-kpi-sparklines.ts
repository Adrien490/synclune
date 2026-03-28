import { PaymentStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { cacheDashboard } from "@/shared/lib/cache";
import { DASHBOARD_CACHE_TAGS } from "@/modules/dashboard/constants/cache";
import { buildSparklinePath } from "../services/kpi-sparkline-builder.service";

type DailyRow = {
	date: string;
	revenue: bigint;
	orders: bigint;
};

export type KpiSparklines = {
	revenuePath: string | null;
	ordersPath: string | null;
	aovPath: string | null;
};

/**
 * Fetches 7-day daily aggregates and builds SVG sparkline paths
 * Kept separate from fetchDashboardKpis to avoid adding latency to the main KPI query
 */
export async function fetchKpiSparklines(): Promise<KpiSparklines> {
	"use cache";

	cacheDashboard(DASHBOARD_CACHE_TAGS.KPIS);

	const sevenDaysAgo = new Date();
	sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

	const rows = await prisma.$queryRaw<DailyRow[]>`
		SELECT
			TO_CHAR("paidAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD') as date,
			COALESCE(SUM(total), 0) as revenue,
			COUNT(*) as orders
		FROM "Order"
		WHERE "paidAt" >= ${sevenDaysAgo}
			AND "paymentStatus"::text = ${PaymentStatus.PAID}
			AND "deletedAt" IS NULL
		GROUP BY TO_CHAR("paidAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD')
		ORDER BY date ASC
	`;

	// Fill missing days with 0s for a continuous 7-day series
	const dateMap = new Map(rows.map((r) => [r.date, r]));
	const revenues: number[] = [];
	const orders: number[] = [];

	for (let i = 0; i < 7; i++) {
		const d = new Date(sevenDaysAgo);
		d.setDate(d.getDate() + i);
		const key = d.toISOString().split("T")[0]!;
		const row = dateMap.get(key);
		revenues.push(row ? Number(row.revenue) : 0);
		orders.push(row ? Number(row.orders) : 0);
	}

	const aov = revenues.map((r, i) => (orders[i]! > 0 ? r / orders[i]! : 0));

	return {
		revenuePath: buildSparklinePath(revenues),
		ordersPath: buildSparklinePath(orders),
		aovPath: buildSparklinePath(aov),
	};
}
