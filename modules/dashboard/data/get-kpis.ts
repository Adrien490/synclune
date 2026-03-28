import {
	FulfillmentStatus,
	NewsletterStatus,
	PaymentStatus,
	RefundStatus,
} from "@/app/generated/prisma/client";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { cacheDashboard } from "@/shared/lib/cache";
import { DASHBOARD_CACHE_TAGS } from "@/modules/dashboard/constants/cache";

import type { GetKpisReturn } from "../types/dashboard.types";

// Re-export pour compatibilité
export type { GetKpisReturn } from "../types/dashboard.types";

// ============================================================================
// HELPERS
// ============================================================================

function getMonthBoundaries() {
	const now = new Date();
	const year = now.getUTCFullYear();
	const month = now.getUTCMonth();

	return {
		currentMonthStart: new Date(Date.UTC(year, month, 1)),
		lastMonthStart: new Date(Date.UTC(year, month - 1, 1)),
		lastMonthEnd: new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)),
	};
}

function computeEvolution(current: number, previous: number): number {
	return previous > 0 ? ((current - previous) / previous) * 100 : 0;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Fetches dashboard KPIs with cache
 * Consolidated: parallel queries for revenue, orders, conversion, fulfillment, discounts, refunds
 */
export async function fetchDashboardKpis(): Promise<GetKpisReturn> {
	"use cache";

	cacheDashboard(DASHBOARD_CACHE_TAGS.KPIS);

	const { currentMonthStart, lastMonthStart, lastMonthEnd } = getMonthBoundaries();

	const [
		currentMonth,
		lastMonth,
		currentTotalOrders,
		lastTotalOrders,
		pendingShipmentCount,
		currentRefunds,
		lastRefunds,
		reviewStats,
		newsletterActive,
		newsletterCurrentMonth,
		newsletterLastMonth,
		currentFulfillmentTime,
		lastFulfillmentTime,
	] = await Promise.all([
		// Revenue + paid orders (current month)
		prisma.order.aggregate({
			where: {
				paidAt: { gte: currentMonthStart },
				paymentStatus: PaymentStatus.PAID,
				...notDeleted,
			},
			_sum: { total: true, discountAmount: true },
			_count: true,
		}),
		// Revenue + paid orders (last month)
		prisma.order.aggregate({
			where: {
				paidAt: { gte: lastMonthStart, lte: lastMonthEnd },
				paymentStatus: PaymentStatus.PAID,
				...notDeleted,
			},
			_sum: { total: true, discountAmount: true },
			_count: true,
		}),
		// Total orders for conversion rate (current month)
		prisma.order.count({
			where: { createdAt: { gte: currentMonthStart }, ...notDeleted },
		}),
		// Total orders for conversion rate (last month)
		prisma.order.count({
			where: {
				createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
				...notDeleted,
			},
		}),
		// Pending shipment count (instantaneous, not monthly)
		prisma.order.count({
			where: {
				paymentStatus: PaymentStatus.PAID,
				fulfillmentStatus: {
					in: [FulfillmentStatus.UNFULFILLED, FulfillmentStatus.PROCESSING],
				},
				...notDeleted,
			},
		}),
		// Completed refunds (current month)
		prisma.refund.aggregate({
			where: {
				status: RefundStatus.COMPLETED,
				createdAt: { gte: currentMonthStart },
			},
			_sum: { amount: true },
			_count: true,
		}),
		// Completed refunds (last month)
		prisma.refund.aggregate({
			where: {
				status: RefundStatus.COMPLETED,
				createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
			},
			_sum: { amount: true },
			_count: true,
		}),
		// Review stats (aggregated across all products)
		prisma.productReviewStats.aggregate({
			_avg: { averageRating: true },
			_sum: { totalCount: true },
		}),
		// Newsletter: total active subscribers
		prisma.newsletterSubscriber.count({
			where: { status: NewsletterStatus.CONFIRMED, deletedAt: null },
		}),
		// Newsletter: new confirmed this month
		prisma.newsletterSubscriber.count({
			where: {
				status: NewsletterStatus.CONFIRMED,
				confirmedAt: { gte: currentMonthStart },
				deletedAt: null,
			},
		}),
		// Newsletter: new confirmed last month
		prisma.newsletterSubscriber.count({
			where: {
				status: NewsletterStatus.CONFIRMED,
				confirmedAt: { gte: lastMonthStart, lte: lastMonthEnd },
				deletedAt: null,
			},
		}),
		// Average fulfillment time (current month) - hours from paidAt to shippedAt
		prisma.$queryRaw<[{ avg_hours: number | null }]>`
			SELECT AVG(EXTRACT(EPOCH FROM ("shippedAt" - "paidAt")) / 3600) as avg_hours
			FROM "Order"
			WHERE "shippedAt" IS NOT NULL
				AND "paidAt" >= ${currentMonthStart}
				AND "paymentStatus" = 'PAID'
				AND "deletedAt" IS NULL
		`,
		// Average fulfillment time (last month)
		prisma.$queryRaw<[{ avg_hours: number | null }]>`
			SELECT AVG(EXTRACT(EPOCH FROM ("shippedAt" - "paidAt")) / 3600) as avg_hours
			FROM "Order"
			WHERE "shippedAt" IS NOT NULL
				AND "paidAt" >= ${lastMonthStart}
				AND "paidAt" <= ${lastMonthEnd}
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
		newsletterGrowth: {
			totalActive: newsletterActive,
			newThisMonth: newsletterCurrentMonth,
			evolution: computeEvolution(newsletterCurrentMonth, newsletterLastMonth),
		},
		avgFulfillmentTime: {
			hours: currentHours,
			evolution: computeEvolution(currentHours, lastHours),
		},
	};
}
