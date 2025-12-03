import { PaymentStatus } from "@/app/generated/prisma/client";
import { isAdmin } from "@/modules/auth/utils/guards";
import { prisma } from "@/shared/lib/prisma";
import { cacheDashboard, DASHBOARD_CACHE_TAGS } from "../constants/cache";
import type { CustomerKpisReturn } from "../types/dashboard.types";
import {
	resolvePeriodToDates,
	calculateEvolution,
	type DashboardPeriod,
} from "../utils/period-resolver";

// Re-export pour compatibilite
export type { CustomerKpisReturn } from "../types/dashboard.types";

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Action serveur pour recuperer les KPIs clients
 */
export async function getCustomerKpis(
	period: DashboardPeriod,
	customStartDate?: Date,
	customEndDate?: Date
): Promise<CustomerKpisReturn> {
	const admin = await isAdmin();

	if (!admin) {
		throw new Error("Admin access required");
	}

	return await fetchCustomerKpis(period, customStartDate, customEndDate);
}

/**
 * Recupere les KPIs clients depuis la DB avec cache
 */
export async function fetchCustomerKpis(
	period: DashboardPeriod,
	customStartDate?: Date,
	customEndDate?: Date
): Promise<CustomerKpisReturn> {
	"use cache: remote";

	cacheDashboard(DASHBOARD_CACHE_TAGS.CUSTOMER_KPIS(period));

	const { startDate, endDate, previousStartDate, previousEndDate } =
		resolvePeriodToDates(period, customStartDate, customEndDate);

	// Requetes paralleles pour la periode actuelle
	const [
		totalCustomers,
		newCustomers,
		customersWithMultipleOrders,
		firstOrdersAov,
		repeatOrdersAov,
	] = await Promise.all([
		// Total clients (tous les users avec au moins une commande payee)
		prisma.user.count({
			where: {
				orders: {
					some: {
						paymentStatus: PaymentStatus.PAID,
					},
				},
			},
		}),

		// Nouveaux clients sur la periode (premiere commande dans la periode)
		countNewCustomers(startDate, endDate),

		// Clients avec plusieurs commandes (recurrents)
		countRepeatCustomers(),

		// AOV premiere commande (periode)
		getFirstOrderAov(startDate, endDate),

		// AOV commandes recurrentes (periode)
		getRepeatOrderAov(startDate, endDate),
	]);

	// Requetes pour la periode precedente
	const [previousTotalCustomers, previousNewCustomers, previousRepeatCustomers] =
		await Promise.all([
			prisma.user.count({
				where: {
					orders: {
						some: {
							paymentStatus: PaymentStatus.PAID,
							paidAt: { lte: previousEndDate },
						},
					},
				},
			}),
			countNewCustomers(previousStartDate, previousEndDate),
			countRepeatCustomersBefore(previousEndDate),
		]);

	// Calcul du taux de recurrence
	const currentRepeatRate =
		totalCustomers > 0 ? (customersWithMultipleOrders / totalCustomers) * 100 : 0;
	const previousRepeatRate =
		previousTotalCustomers > 0
			? (previousRepeatCustomers / previousTotalCustomers) * 100
			: 0;

	return {
		totalCustomers: {
			count: totalCustomers,
			evolution: calculateEvolution(totalCustomers, previousTotalCustomers),
		},
		newCustomers: {
			count: newCustomers,
			evolution: calculateEvolution(newCustomers, previousNewCustomers),
		},
		repeatRate: {
			rate: Math.round(currentRepeatRate * 100) / 100,
			evolution: calculateEvolution(currentRepeatRate, previousRepeatRate),
		},
		firstOrderAov: {
			amount: Math.round(firstOrdersAov * 100) / 100,
			repeatAov: Math.round(repeatOrdersAov * 100) / 100,
		},
	};
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Compte les nouveaux clients (premiere commande payee dans la periode)
 */
async function countNewCustomers(startDate: Date, endDate: Date): Promise<number> {
	// Sous-requete: users dont la premiere commande payee est dans la periode
	const result = await prisma.$queryRaw<{ count: bigint }[]>`
		SELECT COUNT(DISTINCT u.id) as count
		FROM "User" u
		INNER JOIN "Order" o ON o."userId" = u.id
		WHERE o."paymentStatus" = 'PAID'
		AND o."paidAt" >= ${startDate}
		AND o."paidAt" <= ${endDate}
		AND NOT EXISTS (
			SELECT 1 FROM "Order" o2
			WHERE o2."userId" = u.id
			AND o2."paymentStatus" = 'PAID'
			AND o2."paidAt" < ${startDate}
		)
	`;
	return Number(result[0]?.count ?? 0);
}

/**
 * Compte les clients avec plusieurs commandes payees
 */
async function countRepeatCustomers(): Promise<number> {
	const result = await prisma.$queryRaw<{ count: bigint }[]>`
		SELECT COUNT(*) as count
		FROM (
			SELECT "userId"
			FROM "Order"
			WHERE "paymentStatus" = 'PAID'
			AND "userId" IS NOT NULL
			GROUP BY "userId"
			HAVING COUNT(*) > 1
		) sub
	`;
	return Number(result[0]?.count ?? 0);
}

/**
 * Compte les clients recurrents avant une date donnee
 */
async function countRepeatCustomersBefore(beforeDate: Date): Promise<number> {
	const result = await prisma.$queryRaw<{ count: bigint }[]>`
		SELECT COUNT(*) as count
		FROM (
			SELECT "userId"
			FROM "Order"
			WHERE "paymentStatus" = 'PAID'
			AND "userId" IS NOT NULL
			AND "paidAt" <= ${beforeDate}
			GROUP BY "userId"
			HAVING COUNT(*) > 1
		) sub
	`;
	return Number(result[0]?.count ?? 0);
}

/**
 * Calcule le panier moyen des premieres commandes
 */
async function getFirstOrderAov(startDate: Date, endDate: Date): Promise<number> {
	const result = await prisma.$queryRaw<{ avg: number | null }[]>`
		WITH first_orders AS (
			SELECT o.id, o.total
			FROM "Order" o
			WHERE o."paymentStatus" = 'PAID'
			AND o."paidAt" >= ${startDate}
			AND o."paidAt" <= ${endDate}
			AND NOT EXISTS (
				SELECT 1 FROM "Order" o2
				WHERE o2."userId" = o."userId"
				AND o2."paymentStatus" = 'PAID'
				AND o2."paidAt" < o."paidAt"
			)
		)
		SELECT AVG(total) as avg FROM first_orders
	`;
	return result[0]?.avg ?? 0;
}

/**
 * Calcule le panier moyen des commandes recurrentes (non-premieres)
 */
async function getRepeatOrderAov(startDate: Date, endDate: Date): Promise<number> {
	const result = await prisma.$queryRaw<{ avg: number | null }[]>`
		WITH repeat_orders AS (
			SELECT o.id, o.total
			FROM "Order" o
			WHERE o."paymentStatus" = 'PAID'
			AND o."paidAt" >= ${startDate}
			AND o."paidAt" <= ${endDate}
			AND EXISTS (
				SELECT 1 FROM "Order" o2
				WHERE o2."userId" = o."userId"
				AND o2."paymentStatus" = 'PAID'
				AND o2."paidAt" < o."paidAt"
			)
		)
		SELECT AVG(total) as avg FROM repeat_orders
	`;
	return result[0]?.avg ?? 0;
}
