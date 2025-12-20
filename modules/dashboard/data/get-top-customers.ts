import { isAdmin } from "@/modules/auth/utils/guards";
import { prisma } from "@/shared/lib/prisma";
import { cacheDashboard, DASHBOARD_CACHE_TAGS } from "../constants/cache";
import type { GetTopCustomersReturn, TopCustomerItem } from "../types/dashboard.types";
import {
	resolvePeriodToDates,
	type DashboardPeriod,
} from "../utils/period-resolver";

// Re-export pour compatibilite
export type { GetTopCustomersReturn, TopCustomerItem } from "../types/dashboard.types";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Limite maximale de résultats pour éviter les requêtes trop coûteuses */
const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 10;

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
	limit: number = DEFAULT_LIMIT
): Promise<GetTopCustomersReturn> {
	const admin = await isAdmin();

	if (!admin) {
		throw new Error("Admin access required");
	}

	// Valider et limiter le paramètre limit
	const validatedLimit = Math.min(Math.max(1, Math.floor(limit)), MAX_LIMIT);

	return await fetchTopCustomers(period, customStartDate, customEndDate, validatedLimit);
}

/**
 * Recupere les meilleurs clients depuis la DB avec cache
 */
export async function fetchTopCustomers(
	period: DashboardPeriod,
	customStartDate?: Date,
	customEndDate?: Date,
	limit: number = DEFAULT_LIMIT
): Promise<GetTopCustomersReturn> {
	"use cache";

	cacheDashboard(DASHBOARD_CACHE_TAGS.TOP_CUSTOMERS(period));

	// Valider et limiter le paramètre limit pour la sécurité
	const validatedLimit = Math.min(Math.max(1, Math.floor(limit)), MAX_LIMIT);

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
		LIMIT ${validatedLimit}
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
