import { FulfillmentStatus, PaymentStatus, RefundStatus } from "@/app/generated/prisma/client";
import * as Sentry from "@sentry/nextjs";
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
import { computeAverageFulfillmentHours } from "@/modules/dashboard/services/fulfillment-time.service";

import type { GetKpisReturn } from "../types/dashboard.types";

export type { GetKpisReturn } from "../types/dashboard.types";

function computeEvolution(current: number, previous: number): number {
	return previous > 0 ? ((current - previous) / previous) * 100 : 0;
}

/**
 * Fetches dashboard KPIs with cache.
 * Consolidated: parallel queries for revenue, orders, conversion, fulfillment, discounts, refunds.
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

	return Sentry.startSpan(
		{ name: "dashboard.fetchKpis", op: "db.read", attributes: { period, comparisonMode } },
		async () => {
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
				currentShipped,
				lastShipped,
			] = await Promise.all([
				prisma.order.aggregate({
					where: {
						paidAt: { gte: currentStart },
						paymentStatus: PaymentStatus.PAID,
						...notDeleted,
					},
					_sum: { total: true, discountAmount: true },
					_count: true,
				}),
				prisma.order.aggregate({
					where: {
						paidAt: { gte: previousStart, lte: previousEnd },
						paymentStatus: PaymentStatus.PAID,
						...notDeleted,
					},
					_sum: { total: true, discountAmount: true },
					_count: true,
				}),
				prisma.order.count({
					where: { createdAt: { gte: currentStart }, ...notDeleted },
				}),
				prisma.order.count({
					where: {
						createdAt: { gte: previousStart, lte: previousEnd },
						...notDeleted,
					},
				}),
				prisma.order.count({
					where: {
						paymentStatus: PaymentStatus.PAID,
						fulfillmentStatus: {
							in: [FulfillmentStatus.UNFULFILLED, FulfillmentStatus.PROCESSING],
						},
						...notDeleted,
					},
				}),
				prisma.refund.aggregate({
					where: {
						status: RefundStatus.COMPLETED,
						createdAt: { gte: currentStart },
					},
					_sum: { amount: true },
					_count: true,
				}),
				prisma.refund.aggregate({
					where: {
						status: RefundStatus.COMPLETED,
						createdAt: { gte: previousStart, lte: previousEnd },
					},
					_sum: { amount: true },
					_count: true,
				}),
				prisma.order.findMany({
					select: { paidAt: true, shippedAt: true },
					where: {
						shippedAt: { not: null },
						paidAt: { gte: currentStart },
						paymentStatus: PaymentStatus.PAID,
						...notDeleted,
					},
				}),
				prisma.order.findMany({
					select: { paidAt: true, shippedAt: true },
					where: {
						shippedAt: { not: null },
						paidAt: { gte: previousStart, lte: previousEnd },
						paymentStatus: PaymentStatus.PAID,
						...notDeleted,
					},
				}),
			]);

			const currentRevenue = currentMonth._sum.total ?? 0;
			const lastRevenue = lastMonth._sum.total ?? 0;

			const currentRefundAmount = currentRefunds._sum.amount ?? 0;
			const lastRefundAmount = lastRefunds._sum.amount ?? 0;
			const currentNet = currentRevenue - currentRefundAmount;
			const lastNet = lastRevenue - lastRefundAmount;

			const currentCount = currentMonth._count;
			const lastCount = lastMonth._count;

			const currentRefundCount = currentRefunds._count;
			const refundRate = currentCount > 0 ? (currentRefundCount / currentCount) * 100 : 0;

			const currentAov = currentCount > 0 ? currentRevenue / currentCount : 0;
			const lastAov = lastCount > 0 ? lastRevenue / lastCount : 0;

			const currentRate = currentTotalOrders > 0 ? (currentCount / currentTotalOrders) * 100 : 0;
			const lastRate = lastTotalOrders > 0 ? (lastCount / lastTotalOrders) * 100 : 0;

			const currentDiscount = currentMonth._sum.discountAmount ?? 0;
			const lastDiscount = lastMonth._sum.discountAmount ?? 0;

			const currentHours = computeAverageFulfillmentHours(currentShipped);
			const lastHours = computeAverageFulfillmentHours(lastShipped);

			return {
				monthlyRevenue: {
					amount: currentRevenue,
					netAmount: currentNet,
					refundAmount: currentRefundAmount,
					refundCount: currentRefundCount,
					refundRate,
					evolution: computeEvolution(currentNet, lastNet),
					previousVolume: lastCount,
				},
				monthlyOrders: {
					count: currentCount,
					evolution: computeEvolution(currentCount, lastCount),
					previousVolume: lastCount,
				},
				averageOrderValue: {
					amount: currentAov,
					evolution: computeEvolution(currentAov, lastAov),
					previousVolume: lastCount,
				},
				conversionRate: {
					rate: currentRate,
					evolution: computeEvolution(currentRate, lastRate),
					abandoned: currentTotalOrders - currentCount,
					previousVolume: lastTotalOrders,
				},
				pendingShipment: {
					count: pendingShipmentCount,
				},
				discountImpact: {
					amount: currentDiscount,
					evolution: computeEvolution(currentDiscount, lastDiscount),
					previousVolume: lastCount,
				},
				avgFulfillmentTime: {
					hours: currentHours,
					evolution: computeEvolution(currentHours, lastHours),
					previousVolume: lastCount,
				},
			};
		},
	);
}
