import { PaymentStatus, RefundStatus } from "@/app/generated/prisma/client";
import { isAdmin } from "@/modules/auth/utils/guards";
import { prisma } from "@/shared/lib/prisma";
import { cacheDashboardRefundStats } from "../constants/cache";
import type { RefundStatsReturn } from "../types/dashboard.types";
import {
	resolvePeriodToDates,
	calculateEvolution,
	type DashboardPeriod,
} from "../utils/period-resolver";

// Re-export pour compatibilite
export type { RefundStatsReturn } from "../types/dashboard.types";

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Action serveur pour recuperer les stats de remboursements
 */
export async function getRefundStats(
	period: DashboardPeriod,
	customStartDate?: Date,
	customEndDate?: Date
): Promise<RefundStatsReturn> {
	const admin = await isAdmin();

	if (!admin) {
		throw new Error("Admin access required");
	}

	return await fetchRefundStats(period, customStartDate, customEndDate);
}

/**
 * Recupere les stats de remboursements depuis la DB avec cache
 */
export async function fetchRefundStats(
	period: DashboardPeriod,
	customStartDate?: Date,
	customEndDate?: Date
): Promise<RefundStatsReturn> {
	"use cache: remote";

	cacheDashboardRefundStats(period);

	const { startDate, endDate, previousStartDate, previousEndDate } =
		resolvePeriodToDates(period, customStartDate, customEndDate);

	// Periode actuelle
	const [currentRefunds, currentOrders] = await Promise.all([
		// Remboursements de la periode
		prisma.refund.aggregate({
			where: {
				status: RefundStatus.COMPLETED,
				processedAt: { gte: startDate, lte: endDate },
			},
			_sum: { amount: true },
			_count: { id: true },
		}),
		// Commandes payees de la periode (pour calculer le taux)
		prisma.order.count({
			where: {
				paymentStatus: PaymentStatus.PAID,
				paidAt: { gte: startDate, lte: endDate },
			},
		}),
	]);

	// Periode precedente
	const [previousRefunds, previousOrders] = await Promise.all([
		prisma.refund.aggregate({
			where: {
				status: RefundStatus.COMPLETED,
				processedAt: { gte: previousStartDate, lte: previousEndDate },
			},
			_sum: { amount: true },
			_count: { id: true },
		}),
		prisma.order.count({
			where: {
				paymentStatus: PaymentStatus.PAID,
				paidAt: { gte: previousStartDate, lte: previousEndDate },
			},
		}),
	]);

	// Calculs
	const currentTotalRefunded = currentRefunds._sum.amount ?? 0;
	const previousTotalRefunded = previousRefunds._sum.amount ?? 0;

	const currentRefundCount = currentRefunds._count.id;
	const previousRefundCount = previousRefunds._count.id;

	const currentRefundRate =
		currentOrders > 0 ? (currentRefundCount / currentOrders) * 100 : 0;
	const previousRefundRate =
		previousOrders > 0 ? (previousRefundCount / previousOrders) * 100 : 0;

	return {
		totalRefunded: {
			amount: Math.round(currentTotalRefunded * 100) / 100,
			evolution: calculateEvolution(currentTotalRefunded, previousTotalRefunded),
		},
		refundCount: {
			count: currentRefundCount,
			evolution: calculateEvolution(currentRefundCount, previousRefundCount),
		},
		refundRate: {
			rate: Math.round(currentRefundRate * 100) / 100,
			evolution: calculateEvolution(currentRefundRate, previousRefundRate),
		},
	};
}
