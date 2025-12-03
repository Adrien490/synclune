import { PaymentStatus } from "@/app/generated/prisma/client";
import { isAdmin } from "@/modules/auth/utils/guards";
import { prisma } from "@/shared/lib/prisma";
import { cacheDashboard, DASHBOARD_CACHE_TAGS } from "../constants/cache";
import type { RepeatCustomersReturn } from "../types/dashboard.types";
import {
	resolvePeriodToDates,
	type DashboardPeriod,
} from "../utils/period-resolver";

// Re-export pour compatibilite
export type { RepeatCustomersReturn } from "../types/dashboard.types";

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Action serveur pour recuperer la repartition clients nouveaux vs recurrents
 */
export async function getRepeatCustomers(
	period: DashboardPeriod,
	customStartDate?: Date,
	customEndDate?: Date
): Promise<RepeatCustomersReturn> {
	const admin = await isAdmin();

	if (!admin) {
		throw new Error("Admin access required");
	}

	return await fetchRepeatCustomers(period, customStartDate, customEndDate);
}

/**
 * Recupere la repartition clients nouveaux vs recurrents depuis la DB avec cache
 */
export async function fetchRepeatCustomers(
	period: DashboardPeriod,
	customStartDate?: Date,
	customEndDate?: Date
): Promise<RepeatCustomersReturn> {
	"use cache: remote";

	cacheDashboard(DASHBOARD_CACHE_TAGS.REPEAT_CUSTOMERS(period));

	const { startDate, endDate } = resolvePeriodToDates(
		period,
		customStartDate,
		customEndDate
	);

	// Compte les clients uniques qui ont commande dans la periode
	// et distingue ceux qui ont fait une seule commande vs plusieurs
	const result = await prisma.$queryRaw<
		{ order_count: bigint; customer_count: bigint }[]
	>`
		WITH customer_orders AS (
			SELECT
				"userId",
				COUNT(*) as order_count
			FROM "Order"
			WHERE "paymentStatus" = 'PAID'
			AND "paidAt" >= ${startDate}
			AND "paidAt" <= ${endDate}
			AND "userId" IS NOT NULL
			GROUP BY "userId"
		)
		SELECT
			CASE
				WHEN order_count = 1 THEN 1
				ELSE 2
			END as order_count,
			COUNT(*) as customer_count
		FROM customer_orders
		GROUP BY CASE WHEN order_count = 1 THEN 1 ELSE 2 END
	`;

	let oneTimeCustomers = 0;
	let repeatCustomers = 0;

	for (const row of result) {
		if (Number(row.order_count) === 1) {
			oneTimeCustomers = Number(row.customer_count);
		} else {
			repeatCustomers = Number(row.customer_count);
		}
	}

	const totalCustomers = oneTimeCustomers + repeatCustomers;
	const repeatRate =
		totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0;

	return {
		oneTimeCustomers,
		repeatCustomers,
		totalCustomers,
		repeatRate: Math.round(repeatRate * 100) / 100,
	};
}
