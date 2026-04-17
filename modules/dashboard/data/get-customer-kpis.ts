import { AccountStatus } from "@/app/generated/prisma/client";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { cacheDashboard } from "@/shared/lib/cache";
import { DASHBOARD_CACHE_TAGS } from "@/modules/dashboard/constants/cache";
import type { DashboardPeriod } from "@/modules/dashboard/constants/period.constants";
import { DEFAULT_PERIOD } from "@/modules/dashboard/constants/period.constants";
import { getPeriodBoundaries } from "@/modules/dashboard/services/period-boundaries.service";

import type { GetCustomerKpisReturn, TopSpenderItem } from "../types/dashboard.types";

export type { GetCustomerKpisReturn, TopSpenderItem } from "../types/dashboard.types";

function computeEvolution(current: number, previous: number): number {
	return previous > 0 ? ((current - previous) / previous) * 100 : 0;
}

type SpendRow = {
	userId: string;
	name: string | null;
	email: string | null;
	totalSpent: bigint | number;
	orderCount: bigint | number;
};

type ActiveCustomersRow = {
	userId: string;
	hasPriorOrder: boolean;
};

/**
 * Customer-focused KPIs (new acquisitions, retention, top spender)
 * Returning rate = % of active customers (with paid order in period) who had any prior paid order before the period started
 */
export async function fetchCustomerKpis(
	period: DashboardPeriod = DEFAULT_PERIOD,
): Promise<GetCustomerKpisReturn> {
	"use cache";

	cacheDashboard(DASHBOARD_CACHE_TAGS.CUSTOMER_KPIS);

	const { currentStart, previousStart, previousEnd } = getPeriodBoundaries(period);

	const [
		newCustomersCurrent,
		newCustomersPrevious,
		currentActiveCustomers,
		previousActiveCustomers,
		topSpenderRows,
	] = await Promise.all([
		// New customers (current period) - exclude anonymized accounts
		prisma.user.count({
			where: {
				createdAt: { gte: currentStart },
				accountStatus: { not: AccountStatus.ANONYMIZED },
				...notDeleted,
			},
		}),
		// New customers (previous period)
		prisma.user.count({
			where: {
				createdAt: { gte: previousStart, lte: previousEnd },
				accountStatus: { not: AccountStatus.ANONYMIZED },
				...notDeleted,
			},
		}),
		// Active customers in current period + flag if they had any paid order BEFORE currentStart
		prisma.$queryRaw<ActiveCustomersRow[]>`
			SELECT DISTINCT o."userId" as "userId",
				EXISTS (
					SELECT 1 FROM "Order" o2
					WHERE o2."userId" = o."userId"
						AND o2."paymentStatus" = 'PAID'
						AND o2."paidAt" < ${currentStart}
						AND o2."deletedAt" IS NULL
				) as "hasPriorOrder"
			FROM "Order" o
			WHERE o."userId" IS NOT NULL
				AND o."paymentStatus" = 'PAID'
				AND o."paidAt" >= ${currentStart}
				AND o."deletedAt" IS NULL
		`,
		// Active customers in previous period + flag if they had any paid order BEFORE previousStart
		prisma.$queryRaw<ActiveCustomersRow[]>`
			SELECT DISTINCT o."userId" as "userId",
				EXISTS (
					SELECT 1 FROM "Order" o2
					WHERE o2."userId" = o."userId"
						AND o2."paymentStatus" = 'PAID'
						AND o2."paidAt" < ${previousStart}
						AND o2."deletedAt" IS NULL
				) as "hasPriorOrder"
			FROM "Order" o
			WHERE o."userId" IS NOT NULL
				AND o."paymentStatus" = 'PAID'
				AND o."paidAt" >= ${previousStart}
				AND o."paidAt" <= ${previousEnd}
				AND o."deletedAt" IS NULL
		`,
		// Top spender on the period (paid orders only) - returns top 1
		// LEFT JOIN User avoids a N+1 follow-up query when resolving name/email
		prisma.$queryRaw<SpendRow[]>`
			SELECT o."userId" as "userId",
				u."name" as "name",
				u."email" as "email",
				SUM(o."total")::bigint as "totalSpent",
				COUNT(*)::bigint as "orderCount"
			FROM "Order" o
			LEFT JOIN "User" u ON u."id" = o."userId" AND u."deletedAt" IS NULL
			WHERE o."userId" IS NOT NULL
				AND o."paymentStatus" = 'PAID'
				AND o."paidAt" >= ${currentStart}
				AND o."deletedAt" IS NULL
			GROUP BY o."userId", u."name", u."email"
			ORDER BY "totalSpent" DESC
			LIMIT 1
		`,
	]);

	const totalActive = currentActiveCustomers.length;
	const returning = currentActiveCustomers.filter((c) => c.hasPriorOrder).length;
	const previousTotalActive = previousActiveCustomers.length;
	const previousReturning = previousActiveCustomers.filter((c) => c.hasPriorOrder).length;

	const currentRate = totalActive > 0 ? (returning / totalActive) * 100 : 0;
	const previousRate =
		previousTotalActive > 0 ? (previousReturning / previousTotalActive) * 100 : 0;

	let topSpender: TopSpenderItem | null = null;
	const topRow = topSpenderRows[0];
	if (topRow) {
		topSpender = {
			userId: topRow.userId,
			customerName: topRow.name ?? "Client",
			customerEmail: topRow.email ?? "",
			totalSpent: Number(topRow.totalSpent),
			orderCount: Number(topRow.orderCount),
		};
	}

	return {
		newCustomers: {
			count: newCustomersCurrent,
			evolution: computeEvolution(newCustomersCurrent, newCustomersPrevious),
		},
		returningRate: {
			rate: currentRate,
			returningCount: returning,
			totalActiveCustomers: totalActive,
			evolution: computeEvolution(currentRate, previousRate),
		},
		topSpender,
	};
}
