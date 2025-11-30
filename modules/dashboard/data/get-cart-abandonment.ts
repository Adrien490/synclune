import { PaymentStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { cacheDashboardAbandonment } from "../constants/cache";
import type { CartAbandonmentReturn } from "../types/dashboard.types";
import {
	calculateEvolution,
	resolvePeriodToDates,
	type DashboardPeriod,
} from "../utils/period-resolver";

// ============================================================================
// INTERNAL FETCH FUNCTION
// ============================================================================

async function fetchAbandonmentData(startDate: Date, endDate: Date) {
	const now = new Date();

	const [expiredCarts, convertedOrders, activeCarts] = await Promise.all([
		// Paniers expires (expiresAt < now) sans userId (visiteurs)
		prisma.cart.count({
			where: {
				createdAt: { gte: startDate, lte: endDate },
				expiresAt: { lt: now },
				userId: null,
			},
		}),
		// Commandes payees dans la periode
		prisma.order.count({
			where: {
				createdAt: { gte: startDate, lte: endDate },
				paymentStatus: PaymentStatus.PAID,
			},
		}),
		// Paniers encore actifs
		prisma.cart.count({
			where: {
				createdAt: { gte: startDate, lte: endDate },
				OR: [{ expiresAt: { gte: now } }, { expiresAt: null }],
			},
		}),
	]);

	const totalCarts = expiredCarts + convertedOrders + activeCarts;

	// Taux d'abandon = paniers expires / (total - paniers actifs)
	// On ne compte pas les paniers actifs car ils peuvent encore convertir
	const completedJourneys = expiredCarts + convertedOrders;
	const rate =
		completedJourneys > 0 ? (expiredCarts / completedJourneys) * 100 : 0;

	return {
		rate,
		abandonedCarts: expiredCarts,
		convertedCarts: convertedOrders,
		totalCarts,
	};
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Calcule le taux d'abandon de panier pour une periode donnee
 */
export async function fetchCartAbandonment(
	period: DashboardPeriod,
	customStartDate?: Date,
	customEndDate?: Date
): Promise<CartAbandonmentReturn> {
	"use cache: remote";

	cacheDashboardAbandonment(period);

	const { startDate, endDate, previousStartDate, previousEndDate } =
		resolvePeriodToDates(period, customStartDate, customEndDate);

	const [currentData, previousData] = await Promise.all([
		fetchAbandonmentData(startDate, endDate),
		fetchAbandonmentData(previousStartDate, previousEndDate),
	]);

	return {
		rate: currentData.rate,
		abandonedCarts: currentData.abandonedCarts,
		convertedCarts: currentData.convertedCarts,
		totalCarts: currentData.totalCarts,
		evolution: calculateEvolution(currentData.rate, previousData.rate),
	};
}
