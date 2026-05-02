import { FulfillmentStatus, PaymentStatus, RefundStatus } from "@/app/generated/prisma/client";
import { cacheTag } from "next/cache";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { cacheDashboard } from "@/shared/lib/cache";
import { DASHBOARD_CACHE_TAGS } from "@/modules/dashboard/constants/cache";
import { ORDERS_CACHE_TAGS } from "@/modules/orders/constants/cache";
import type {
	ComparisonMode,
	DashboardPeriod,
} from "@/modules/dashboard/constants/period.constants";
import {
	DEFAULT_COMPARISON_MODE,
	DEFAULT_PERIOD,
} from "@/modules/dashboard/constants/period.constants";
import { getPeriodBoundaries } from "@/modules/dashboard/services/period-boundaries.service";

import type { GetKpisReturn } from "../types/dashboard.types";

// Re-export pour compatibilité
export type { GetKpisReturn } from "../types/dashboard.types";

// ============================================================================
// HELPERS
// ============================================================================

function computeEvolution(current: number, previous: number): number {
	return previous > 0 ? ((current - previous) / previous) * 100 : 0;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Fetches dashboard KPIs with cache
 * Consolidated: parallel queries for revenue, orders, conversion, fulfillment, discounts, refunds
 *
 * @param period - Period scope (e.g. "month", "year")
 * @param comparisonMode - "previous" (default) compares vs immediately preceding period.
 *                        "yoy" compares vs the same period one year earlier.
 */
export async function fetchDashboardKpis(
	period: DashboardPeriod = DEFAULT_PERIOD,
	comparisonMode: ComparisonMode = DEFAULT_COMPARISON_MODE,
): Promise<GetKpisReturn> {
	"use cache";

	cacheDashboard(DASHBOARD_CACHE_TAGS.KPIS);
	cacheTag(ORDERS_CACHE_TAGS.LIST);

	const boundaries = getPeriodBoundaries(period);
	const currentStart = boundaries.currentStart;
	const previousStart =
		comparisonMode === "yoy" ? boundaries.previousYearStart : boundaries.previousStart;
	const previousEnd =
		comparisonMode === "yoy" ? boundaries.previousYearEnd : boundaries.previousEnd;

	const [
		currentMonth,
		lastMonth,
		currentTotalOrders,
		lastTotalOrders,
		pendingShipmentCount,
		currentRefunds,
		lastRefunds,
		reviewStats,
		currentFulfillmentTime,
		lastFulfillmentTime,
	] = await Promise.all([
		// Revenue + paid orders (current period)
		prisma.order.aggregate({
			where: {
				paidAt: { gte: currentStart },
				paymentStatus: PaymentStatus.PAID,
				...notDeleted,
			},
			_sum: { total: true, discountAmount: true },
			_count: true,
		}),
		// Revenue + paid orders (previous period)
		prisma.order.aggregate({
			where: {
				paidAt: { gte: previousStart, lte: previousEnd },
				paymentStatus: PaymentStatus.PAID,
				...notDeleted,
			},
			_sum: { total: true, discountAmount: true },
			_count: true,
		}),
		// Total orders for conversion rate (current period)
		prisma.order.count({
			where: { createdAt: { gte: currentStart }, ...notDeleted },
		}),
		// Total orders for conversion rate (previous period)
		prisma.order.count({
			where: {
				createdAt: { gte: previousStart, lte: previousEnd },
				...notDeleted,
			},
		}),
		// Pending shipment count (instantaneous, not period-based)
		prisma.order.count({
			where: {
				paymentStatus: PaymentStatus.PAID,
				fulfillmentStatus: {
					in: [FulfillmentStatus.UNFULFILLED, FulfillmentStatus.PROCESSING],
				},
				...notDeleted,
			},
		}),
		// Completed refunds (current period)
		prisma.refund.aggregate({
			where: {
				status: RefundStatus.COMPLETED,
				createdAt: { gte: currentStart },
			},
			_sum: { amount: true },
			_count: true,
		}),
		// Completed refunds (previous period)
		prisma.refund.aggregate({
			where: {
				status: RefundStatus.COMPLETED,
				createdAt: { gte: previousStart, lte: previousEnd },
			},
			_sum: { amount: true },
			_count: true,
		}),
		// Review stats (aggregated across all products)
		prisma.productReviewStats.aggregate({
			_avg: { averageRating: true },
			_sum: { totalCount: true },
		}),
		// Average fulfillment time (current period) - hours from paidAt to shippedAt
		prisma.$queryRaw<[{ avg_hours: number | null }]>`
			SELECT AVG(EXTRACT(EPOCH FROM ("shippedAt" - "paidAt")) / 3600) as avg_hours
			FROM "Order"
			WHERE "shippedAt" IS NOT NULL
				AND "paidAt" >= ${currentStart}
				AND "paymentStatus" = 'PAID'
				AND "deletedAt" IS NULL
		`,
		// Average fulfillment time (previous period)
		prisma.$queryRaw<[{ avg_hours: number | null }]>`
			SELECT AVG(EXTRACT(EPOCH FROM ("shippedAt" - "paidAt")) / 3600) as avg_hours
			FROM "Order"
			WHERE "shippedAt" IS NOT NULL
				AND "paidAt" >= ${previousStart}
				AND "paidAt" <= ${previousEnd}
				AND "paymentStatus" = 'PAID'
				AND "deletedAt" IS NULL
		`,
	]);

	// Revenue
	const currentRevenue = currentMonth._sum.total ?? 0;
	const lastRevenue = lastMonth._sum.total ?? 0;

	// Refunds
	const currentRefundAmount = currentRefunds._sum.amount ?? 0;
	const lastRefundAmount = lastRefunds._sum.amount ?? 0;
	const currentNet = currentRevenue - currentRefundAmount;
	const lastNet = lastRevenue - lastRefundAmount;

	// Order counts
	const currentCount = currentMonth._count;
	const lastCount = lastMonth._count;

	// AOV
	const currentAov = currentCount > 0 ? currentRevenue / currentCount : 0;
	const lastAov = lastCount > 0 ? lastRevenue / lastCount : 0;

	// Conversion rate
	const currentRate = currentTotalOrders > 0 ? (currentCount / currentTotalOrders) * 100 : 0;
	const lastRate = lastTotalOrders > 0 ? (lastCount / lastTotalOrders) * 100 : 0;

	// Discount impact
	const currentDiscount = currentMonth._sum.discountAmount ?? 0;
	const lastDiscount = lastMonth._sum.discountAmount ?? 0;

	// Review health
	const avgRating = Number(reviewStats._avg.averageRating ?? 0);
	const totalReviews = reviewStats._sum.totalCount ?? 0;

	// Fulfillment time
	const currentHours = Number(currentFulfillmentTime[0].avg_hours ?? 0);
	const lastHours = Number(lastFulfillmentTime[0].avg_hours ?? 0);

	return {
		monthlyRevenue: {
			amount: currentRevenue,
			netAmount: currentNet,
			refundAmount: currentRefundAmount,
			refundCount: currentRefunds._count,
			evolution: computeEvolution(currentNet, lastNet),
		},
		monthlyOrders: {
			count: currentCount,
			evolution: computeEvolution(currentCount, lastCount),
		},
		averageOrderValue: {
			amount: currentAov,
			evolution: computeEvolution(currentAov, lastAov),
		},
		conversionRate: {
			rate: currentRate,
			evolution: computeEvolution(currentRate, lastRate),
			abandoned: currentTotalOrders - currentCount,
		},
		pendingShipment: {
			count: pendingShipmentCount,
		},
		discountImpact: {
			amount: currentDiscount,
			evolution: computeEvolution(currentDiscount, lastDiscount),
		},
		reviewHealth: {
			averageRating: avgRating,
			totalReviews: totalReviews,
		},
		avgFulfillmentTime: {
			hours: currentHours,
			evolution: computeEvolution(currentHours, lastHours),
		},
	};
}
