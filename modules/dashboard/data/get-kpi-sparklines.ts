import { PaymentStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { cacheDashboard } from "@/shared/lib/cache";
import { DASHBOARD_CACHE_TAGS } from "@/modules/dashboard/constants/cache";
import type { DashboardPeriod } from "@/modules/dashboard/constants/period.constants";
import { DEFAULT_PERIOD } from "@/modules/dashboard/constants/period.constants";
import { getPeriodBoundaries } from "@/modules/dashboard/services/period-boundaries.service";
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

const SPARKLINE_BUCKETS = 7;

/**
 * Fetches daily aggregates for the current period and builds SVG sparkline paths
 * Always produces 7 data points by dividing the period into equal buckets
 */
export async function fetchKpiSparklines(
	period: DashboardPeriod = DEFAULT_PERIOD,
): Promise<KpiSparklines> {
	"use cache";

	cacheDashboard(DASHBOARD_CACHE_TAGS.KPIS);

	const { currentStart } = getPeriodBoundaries(period);

	// Fetch daily aggregates for the full period
	const rows = await prisma.$queryRaw<DailyRow[]>`
		SELECT
			TO_CHAR("paidAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD') as date,
			COALESCE(SUM(total), 0) as revenue,
			COUNT(*) as orders
		FROM "Order"
		WHERE "paidAt" >= ${currentStart}
			AND "paymentStatus"::text = ${PaymentStatus.PAID}
			AND "deletedAt" IS NULL
		GROUP BY TO_CHAR("paidAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD')
		ORDER BY date ASC
	`;

	// Compute period length in days
	const now = new Date();
	const totalDays = Math.max(
		1,
		Math.ceil((now.getTime() - currentStart.getTime()) / (1000 * 60 * 60 * 24)),
	);

	// Build date -> row map for lookup
	const dateMap = new Map(rows.map((r) => [r.date, r]));

	// Collect daily data for the full period
	const dailyRevenues: number[] = [];
	const dailyOrders: number[] = [];

	for (let i = 0; i < totalDays; i++) {
		const d = new Date(currentStart);
		d.setDate(d.getDate() + i);
		const key = d.toISOString().split("T")[0]!;
		const row = dateMap.get(key);
		dailyRevenues.push(row ? Number(row.revenue) : 0);
		dailyOrders.push(row ? Number(row.orders) : 0);
	}

	// Aggregate into 7 equal buckets
	const revenues = aggregateIntoBuckets(dailyRevenues, SPARKLINE_BUCKETS);
	const orders = aggregateIntoBuckets(dailyOrders, SPARKLINE_BUCKETS);
	const aov = revenues.map((r, i) => (orders[i]! > 0 ? r / orders[i]! : 0));

	return {
		revenuePath: buildSparklinePath(revenues),
		ordersPath: buildSparklinePath(orders),
		aovPath: buildSparklinePath(aov),
	};
}

/**
 * Divides an array of daily values into N equal-sized buckets, summing each
 * When fewer values than buckets, pads with trailing zeros to avoid empty gaps
 */
export function aggregateIntoBuckets(values: number[], bucketCount: number): number[] {
	if (values.length === 0) return new Array(bucketCount).fill(0) as number[];

	// When fewer values than buckets, use values directly + zero padding
	if (values.length <= bucketCount) {
		const result = [...values];
		while (result.length < bucketCount) result.push(0);
		return result;
	}

	const bucketSize = values.length / bucketCount;
	const buckets: number[] = [];

	for (let i = 0; i < bucketCount; i++) {
		const start = Math.floor(i * bucketSize);
		const end = Math.floor((i + 1) * bucketSize);
		let sum = 0;
		for (let j = start; j < end; j++) {
			sum += values[j] ?? 0;
		}
		buckets.push(sum);
	}

	return buckets;
}
