import { PaymentStatus } from "@/app/generated/prisma/client";
import { isAdmin } from "@/modules/auth/utils/guards";
import { prisma } from "@/shared/lib/prisma";
import { cacheDashboardTopCustomers } from "../constants/cache";
import type { GetTopCustomersReturn, TopCustomerItem } from "../types/dashboard.types";
import {
	resolvePeriodToDates,
	type DashboardPeriod,
} from "../utils/period-resolver";

// Re-export pour compatibilite
export type { GetTopCustomersReturn, TopCustomerItem } from "../types/dashboard.types";

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Action serveur pour recuperer les meilleurs clients
 */
export async function getTopCustomers(
	period: DashboardPeriod,
	customStartDate?: Date,
	customEndDate?: Date,
	limit: number = 10
): Promise<GetTopCustomersReturn> {
	const admin = await isAdmin();

	if (!admin) {
		throw new Error("Admin access required");
	}

	return await fetchTopCustomers(period, customStartDate, customEndDate, limit);
}

/**
 * Recupere les meilleurs clients depuis la DB avec cache
 */
export async function fetchTopCustomers(
	period: DashboardPeriod,
	customStartDate?: Date,
	customEndDate?: Date,
	limit: number = 10
): Promise<GetTopCustomersReturn> {
	"use cache: remote";

	cacheDashboardTopCustomers(period);

	const { startDate, endDate } = resolvePeriodToDates(
		period,
		customStartDate,
		customEndDate
	);

	// Agreger les commandes par client
	const topCustomersRaw = await prisma.$queryRaw<
		{
			userId: string;
			name: string | null;
			email: string;
			ordersCount: bigint;
			totalSpent: bigint;
			lastOrderDate: Date;
		}[]
	>`
		SELECT
			u.id as "userId",
			u.name,
			u.email,
			COUNT(o.id) as "ordersCount",
			SUM(o.total) as "totalSpent",
			MAX(o."paidAt") as "lastOrderDate"
		FROM "User" u
		INNER JOIN "Order" o ON o."userId" = u.id
		WHERE o."paymentStatus" = 'PAID'
		AND o."paidAt" >= ${startDate}
		AND o."paidAt" <= ${endDate}
		GROUP BY u.id, u.name, u.email
		ORDER BY "totalSpent" DESC
		LIMIT ${limit}
	`;

	const customers: TopCustomerItem[] = topCustomersRaw.map((row) => ({
		userId: row.userId,
		name: row.name || "Client anonyme",
		email: row.email,
		ordersCount: Number(row.ordersCount),
		totalSpent: Math.round(Number(row.totalSpent)) / 100,
		lastOrderDate: row.lastOrderDate,
	}));

	return { customers };
}
