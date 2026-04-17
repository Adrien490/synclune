import { NewsletterStatus, PaymentStatus, ReviewStatus } from "@/app/generated/prisma/client";
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

type DailyCountRow = {
	date: string;
	count: bigint;
};

export type KpiSparklines = {
	revenuePath: string | null;
	ordersPath: string | null;
	aovPath: string | null;
	newsletterPath: string | null;
	reviewsPath: string | null;
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

	// Fetch daily aggregates for the full period (parallelised — 3 independent queries)
	const [orderRows, newsletterRows, reviewRows] = await Promise.all([
		prisma.$queryRaw<DailyRow[]>`
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
		`,
		prisma.$queryRaw<DailyCountRow[]>`
			SELECT
				TO_CHAR("confirmedAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD') as date,
				COUNT(*) as count
			FROM "NewsletterSubscriber"
			WHERE "confirmedAt" >= ${currentStart}
				AND "status"::text = ${NewsletterStatus.CONFIRMED}
			GROUP BY TO_CHAR("confirmedAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD')
			ORDER BY date ASC
		`,
		prisma.$queryRaw<DailyCountRow[]>`
			SELECT
				TO_CHAR("createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD') as date,
				COUNT(*) as count
			FROM "ProductReview"
			WHERE "createdAt" >= ${currentStart}
				AND "status"::text = ${ReviewStatus.PUBLISHED}
				AND "deletedAt" IS NULL
			GROUP BY TO_CHAR("createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD')
			ORDER BY date ASC
		`,
	]);

	// Compute period length in days
	const now = new Date();
	const totalDays = Math.max(
		1,
		Math.ceil((now.getTime() - currentStart.getTime()) / (1000 * 60 * 60 * 24)),
	);

	// Build date -> row maps for lookup
	const orderMap = new Map(orderRows.map((r) => [r.date, r]));
	const newsletterMap = new Map(newsletterRows.map((r) => [r.date, Number(r.count)]));
	const reviewMap = new Map(reviewRows.map((r) => [r.date, Number(r.count)]));

	// Collect daily data for the full period
	const dailyRevenues: number[] = [];
	const dailyOrders: number[] = [];
	const dailyNewsletter: number[] = [];
	const dailyReviews: number[] = [];

	for (let i = 0; i < totalDays; i++) {
		const d = new Date(currentStart);
		d.setDate(d.getDate() + i);
		const key = d.toISOString().split("T")[0]!;
		const orderRow = orderMap.get(key);
		dailyRevenues.push(orderRow ? Number(orderRow.revenue) : 0);
		dailyOrders.push(orderRow ? Number(orderRow.orders) : 0);
		dailyNewsletter.push(newsletterMap.get(key) ?? 0);
		dailyReviews.push(reviewMap.get(key) ?? 0);
	}

	// Aggregate into 7 equal buckets
	const revenues = aggregateIntoBuckets(dailyRevenues, SPARKLINE_BUCKETS);
	const orders = aggregateIntoBuckets(dailyOrders, SPARKLINE_BUCKETS);
	const aov = revenues.map((r, i) => (orders[i]! > 0 ? r / orders[i]! : 0));
	const newsletter = aggregateIntoBuckets(dailyNewsletter, SPARKLINE_BUCKETS);
	const reviews = aggregateIntoBuckets(dailyReviews, SPARKLINE_BUCKETS);

	return {
		revenuePath: buildSparklinePath(revenues),
		ordersPath: buildSparklinePath(orders),
		aovPath: buildSparklinePath(aov),
		newsletterPath: buildSparklinePath(newsletter),
		reviewsPath: buildSparklinePath(reviews),
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
