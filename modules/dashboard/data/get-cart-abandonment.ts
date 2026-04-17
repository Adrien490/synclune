import { prisma } from "@/shared/lib/prisma";
import { cacheDashboard } from "@/shared/lib/cache";
import { DASHBOARD_CACHE_TAGS } from "@/modules/dashboard/constants/cache";
import type { DashboardPeriod } from "@/modules/dashboard/constants/period.constants";
import { DEFAULT_PERIOD } from "@/modules/dashboard/constants/period.constants";
import { getPeriodBoundaries } from "@/modules/dashboard/services/period-boundaries.service";

import type { GetCartAbandonmentReturn } from "../types/dashboard.types";

export type { GetCartAbandonmentReturn } from "../types/dashboard.types";

function computeEvolution(current: number, previous: number): number {
	return previous > 0 ? ((current - previous) / previous) * 100 : 0;
}

type ActiveCartsRow = {
	cart_count: bigint | number | null;
	total_value: bigint | number | null;
};

type CountRow = { count: bigint | number };

/**
 * Cart abandonment & recovery metrics
 * - activeCarts: snapshot of carts with items still actionable (not expired)
 * - abandonedEmailsSent: count of carts that received a recovery email in the period
 * - recoveryRate: % of those carts where the user/guest subsequently completed a paid order
 */
export async function fetchCartAbandonment(
	period: DashboardPeriod = DEFAULT_PERIOD,
): Promise<GetCartAbandonmentReturn> {
	"use cache";

	cacheDashboard(DASHBOARD_CACHE_TAGS.CART_ABANDONMENT);

	const { currentStart, previousStart, previousEnd } = getPeriodBoundaries(period);

	const [activeCartsRows, currentEmailsSentRows, previousEmailsSentRows, recoveryRows] =
		await Promise.all([
			// Active carts (snapshot): carts with items, not expired
			prisma.$queryRaw<ActiveCartsRow[]>`
				SELECT COUNT(DISTINCT c.id)::bigint as cart_count,
					COALESCE(SUM(ci."priceAtAdd" * ci."quantity"), 0)::bigint as total_value
				FROM "Cart" c
				INNER JOIN "CartItem" ci ON ci."cartId" = c.id
				WHERE (c."expiresAt" IS NULL OR c."expiresAt" > NOW())
			`,
			// Recovery emails sent (current period)
			prisma.$queryRaw<CountRow[]>`
				SELECT COUNT(*)::bigint as count
				FROM "Cart"
				WHERE "abandonedEmailSentAt" >= ${currentStart}
			`,
			// Recovery emails sent (previous period)
			prisma.$queryRaw<CountRow[]>`
				SELECT COUNT(*)::bigint as count
				FROM "Cart"
				WHERE "abandonedEmailSentAt" >= ${previousStart}
					AND "abandonedEmailSentAt" <= ${previousEnd}
			`,
			// Recovered carts (current + previous in one query for efficiency)
			prisma.$queryRaw<{ period: "current" | "previous"; count: bigint | number }[]>`
				SELECT 'current' as period, COUNT(DISTINCT c.id)::bigint as count
				FROM "Cart" c
				WHERE c."abandonedEmailSentAt" >= ${currentStart}
					AND (
						(c."userId" IS NOT NULL AND EXISTS (
							SELECT 1 FROM "Order" o
							WHERE o."userId" = c."userId"
								AND o."paymentStatus" = 'PAID'
								AND o."paidAt" > c."abandonedEmailSentAt"
								AND o."deletedAt" IS NULL
						))
						OR
						(c."guestEmail" IS NOT NULL AND EXISTS (
							SELECT 1 FROM "Order" o
							WHERE o."customerEmail" = c."guestEmail"
								AND o."paymentStatus" = 'PAID'
								AND o."paidAt" > c."abandonedEmailSentAt"
								AND o."deletedAt" IS NULL
						))
					)
				UNION ALL
				SELECT 'previous' as period, COUNT(DISTINCT c.id)::bigint as count
				FROM "Cart" c
				WHERE c."abandonedEmailSentAt" >= ${previousStart}
					AND c."abandonedEmailSentAt" <= ${previousEnd}
					AND (
						(c."userId" IS NOT NULL AND EXISTS (
							SELECT 1 FROM "Order" o
							WHERE o."userId" = c."userId"
								AND o."paymentStatus" = 'PAID'
								AND o."paidAt" > c."abandonedEmailSentAt"
								AND o."deletedAt" IS NULL
						))
						OR
						(c."guestEmail" IS NOT NULL AND EXISTS (
							SELECT 1 FROM "Order" o
							WHERE o."customerEmail" = c."guestEmail"
								AND o."paymentStatus" = 'PAID'
								AND o."paidAt" > c."abandonedEmailSentAt"
								AND o."deletedAt" IS NULL
						))
					)
			`,
		]);

	const active = activeCartsRows[0];
	const currentEmailsSent = Number(currentEmailsSentRows[0]?.count ?? 0);
	const previousEmailsSent = Number(previousEmailsSentRows[0]?.count ?? 0);

	const recoveryByPeriod = new Map(recoveryRows.map((r) => [r.period, Number(r.count)]));
	const currentRecovered = recoveryByPeriod.get("current") ?? 0;
	const previousRecovered = recoveryByPeriod.get("previous") ?? 0;

	const currentRate = currentEmailsSent > 0 ? (currentRecovered / currentEmailsSent) * 100 : 0;
	const previousRate = previousEmailsSent > 0 ? (previousRecovered / previousEmailsSent) * 100 : 0;

	return {
		activeCarts: {
			count: Number(active?.cart_count ?? 0),
			totalValue: Number(active?.total_value ?? 0),
		},
		abandonedEmailsSent: {
			count: currentEmailsSent,
			evolution: computeEvolution(currentEmailsSent, previousEmailsSent),
		},
		recoveryRate: {
			rate: currentRate,
			recoveredCount: currentRecovered,
			evolution: computeEvolution(currentRate, previousRate),
		},
	};
}
