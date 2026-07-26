import { RefundStatus } from "@/app/generated/prisma/client";
import * as Sentry from "@sentry/nextjs";
import { cacheTag } from "next/cache";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { cacheDashboard } from "@/shared/lib/cache";
import { DASHBOARD_CACHE_TAGS } from "@/modules/dashboard/constants/cache";
import { ORDERS_CACHE_TAGS } from "@/modules/orders/constants/cache";
import { PAID_REVENUE_STATUSES } from "@/modules/orders/constants/revenue-status.constants";
import { buildToShipWhereClause } from "@/modules/orders/services/to-ship.service";
import type { DashboardPeriod } from "@/modules/dashboard/constants/period.constants";
import { DEFAULT_PERIOD } from "@/modules/dashboard/constants/period.constants";
import {
	getChartConfig,
	getPeriodBoundaries,
} from "@/modules/dashboard/services/period-boundaries.service";
import { computeAverageFulfillmentHours } from "@/modules/dashboard/services/fulfillment-time.service";
import {
	buildRevenueMap,
	fillMissingDates,
} from "@/modules/dashboard/services/revenue-chart-builder.service";

import type { GetKpisReturn, RevenueRow } from "../types/dashboard.types";

export type { GetKpisReturn } from "../types/dashboard.types";

function computeEvolution(current: number, previous: number): number {
	return previous > 0 ? ((current - previous) / previous) * 100 : 0;
}

/** Nouveaux clients (1ʳᵉ commande payée) — courant + comparaison en une requête. */
type NewCustomersRow = { currentCount: bigint; previousCount: bigint };

/**
 * Fetches dashboard KPIs with cache.
 * Consolidated: parallel queries for revenue, orders, conversion, fulfillment, discounts, refunds.
 *
 * @param period - Period scope (e.g. "month", "year")
 */
export async function fetchDashboardKpis(
	period: DashboardPeriod = DEFAULT_PERIOD,
): Promise<GetKpisReturn> {
	"use cache";

	cacheDashboard(DASHBOARD_CACHE_TAGS.KPIS);
	cacheTag(ORDERS_CACHE_TAGS.LIST);

	return Sentry.startSpan(
		{ name: "dashboard.fetchKpis", op: "db.read", attributes: { period } },
		async () => {
			const boundaries = getPeriodBoundaries(period);
			const sparklineConfig = getChartConfig(period);
			const currentStart = boundaries.currentStart;
			const previousStart = boundaries.previousStart;
			const previousEnd = boundaries.previousEnd;

			const [
				currentMonth,
				lastMonth,
				currentTotalOrders,
				lastTotalOrders,
				currentPaidCreated,
				lastPaidCreated,
				pendingShipmentCount,
				currentRefunds,
				lastRefunds,
				currentShipped,
				lastShipped,
				sparklineRows,
				newCustomersRows,
			] = await Promise.all([
				// Revenu encaissé (ANALYTICS-AUDIT-001) : inclut PARTIALLY_REFUNDED / REFUNDED,
				// les remboursements sont déduits séparément ci-dessous.
				prisma.order.aggregate({
					where: {
						paidAt: { gte: currentStart },
						paymentStatus: { in: [...PAID_REVENUE_STATUSES] },
						...notDeleted,
					},
					_sum: { total: true, discountAmount: true },
					_count: true,
				}),
				prisma.order.aggregate({
					where: {
						paidAt: { gte: previousStart, lte: previousEnd },
						paymentStatus: { in: [...PAID_REVENUE_STATUSES] },
						...notDeleted,
					},
					_sum: { total: true, discountAmount: true },
					_count: true,
				}),
				// Taux de conversion (ANALYTICS-AUDIT-006) : numérateur ET dénominateur
				// sur la même cohorte `createdAt` (commandes créées dans la période).
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
						createdAt: { gte: currentStart },
						paymentStatus: { in: [...PAID_REVENUE_STATUSES] },
						...notDeleted,
					},
				}),
				prisma.order.count({
					where: {
						createdAt: { gte: previousStart, lte: previousEnd },
						paymentStatus: { in: [...PAID_REVENUE_STATUSES] },
						...notDeleted,
					},
				}),
				// "À expédier" — prédicat SSOT partagé avec la pastille de navigation
				// (`getAdminNavBadges`). Les deux divergeaient : ce compteur n'excluait pas
				// les commandes annulées, la pastille ignorait PARTIALLY_REFUNDED/PROCESSING.
				prisma.order.count({ where: buildToShipWhereClause() }),
				// Remboursements (ANALYTICS-AUDIT-007) : bucketés sur `processedAt`
				// (date de décaissement Stripe), cohérent avec le CA cash-basis.
				prisma.refund.aggregate({
					where: {
						status: RefundStatus.COMPLETED,
						processedAt: { gte: currentStart },
					},
					_sum: { amount: true },
					_count: true,
				}),
				prisma.refund.aggregate({
					where: {
						status: RefundStatus.COMPLETED,
						processedAt: { gte: previousStart, lte: previousEnd },
					},
					_sum: { amount: true },
					_count: true,
				}),
				prisma.order.findMany({
					select: { paidAt: true, shippedAt: true },
					where: {
						shippedAt: { not: null },
						paidAt: { gte: currentStart },
						paymentStatus: { in: [...PAID_REVENUE_STATUSES] },
						...notDeleted,
					},
				}),
				prisma.order.findMany({
					select: { paidAt: true, shippedAt: true },
					where: {
						shippedAt: { not: null },
						paidAt: { gte: previousStart, lte: previousEnd },
						paymentStatus: { in: [...PAID_REVENUE_STATUSES] },
						...notDeleted,
					},
				}),
				// Série de la période (heure Paris, ANALYTICS-AUDIT-005) pour la sparkline
				// de fond des KpiCard. Même granularité que le graphe (getChartConfig) puis
				// fillMissingDates → espacement temporel uniforme (pas d'effondrement des
				// jours creux). Statuts encaissés (ANALYTICS-AUDIT-001), = ANY(...) sans
				// cast ::text pour préserver l'usage d'index (A-008).
				prisma.$queryRaw<RevenueRow[]>`
					SELECT
						TO_CHAR(("paidAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Paris', ${sparklineConfig.sqlDateFormat}) as date,
						COALESCE(SUM(total), 0) as revenue,
						COUNT(*) as orders,
						COALESCE(SUM(subtotal), 0) as subtotal,
						COALESCE(SUM("discountAmount"), 0) as discounts,
						COALESCE(SUM("shippingCost"), 0) as shipping
					FROM "Order"
					WHERE "paidAt" >= ${sparklineConfig.startDate}
						AND "paymentStatus" = ANY(${[...PAID_REVENUE_STATUSES]}::"PaymentStatus"[])
						AND "deletedAt" IS NULL
					GROUP BY date
					ORDER BY date ASC
				`,
				// Nouveaux clients : on regroupe par clé client (COALESCE userId, email) et on
				// date l'acquisition au MIN(paidAt). FILTER compte courant + comparaison en une
				// passe. Statuts encaissés (ANALYTICS-AUDIT-001), bornes Paris (A-005).
				prisma.$queryRaw<NewCustomersRow[]>`
					SELECT
						COUNT(*) FILTER (WHERE first_paid >= ${currentStart}) AS "currentCount",
						COUNT(*) FILTER (WHERE first_paid >= ${previousStart} AND first_paid <= ${previousEnd}) AS "previousCount"
					FROM (
						SELECT MIN("paidAt") AS first_paid
						FROM "Order"
						WHERE "paymentStatus" = ANY(${[...PAID_REVENUE_STATUSES]}::"PaymentStatus"[])
							AND "deletedAt" IS NULL
						GROUP BY COALESCE("userId", "customerEmail")
					) firsts
				`,
			]);

			const sparklinePoints = fillMissingDates(
				buildRevenueMap(sparklineRows),
				sparklineConfig.startDate,
				sparklineConfig.pointCount,
				sparklineConfig.granularity,
			);
			const sparklineRevenue = sparklinePoints.map((point) => point.revenue);
			const sparklineOrders = sparklinePoints.map((point) => point.orders);

			const newCustomersCurrent = Number(newCustomersRows[0]?.currentCount ?? 0);
			const newCustomersPrevious = Number(newCustomersRows[0]?.previousCount ?? 0);

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

			const currentRate =
				currentTotalOrders > 0 ? (currentPaidCreated / currentTotalOrders) * 100 : 0;
			const lastRate = lastTotalOrders > 0 ? (lastPaidCreated / lastTotalOrders) * 100 : 0;

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
					abandoned: currentTotalOrders - currentPaidCreated,
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
				newCustomers: {
					count: newCustomersCurrent,
					evolution: computeEvolution(newCustomersCurrent, newCustomersPrevious),
					previousVolume: newCustomersPrevious,
				},
				sparklines: {
					revenue: sparklineRevenue,
					orders: sparklineOrders,
				},
			};
		},
	);
}
