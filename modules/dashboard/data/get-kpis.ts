import { RefundStatus } from "@/app/generated/prisma/client";
import * as Sentry from "@sentry/nextjs";
import { cacheTag } from "next/cache";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { cacheDashboard } from "@/shared/lib/cache";
import { DASHBOARD_CACHE_TAGS } from "@/modules/dashboard/constants/cache";
import { ORDERS_CACHE_TAGS } from "@/modules/orders/constants/cache";
import { PAID_REVENUE_STATUSES } from "@/modules/orders/constants/revenue-status.constants";
import { buildToShipWhereClause } from "@/modules/orders/services/to-ship.service";
import { DEFAULT_PERIOD } from "@/modules/dashboard/constants/period.constants";
import { getPeriodBoundaries } from "@/modules/dashboard/services/period-boundaries.service";

import type { GetKpisReturn } from "../types/dashboard.types";

export type { GetKpisReturn } from "../types/dashboard.types";

/** Nouveaux clients (1ʳᵉ commande payée dans le mois). */
type NewCustomersRow = { currentCount: bigint };

/**
 * Fetches dashboard KPIs with cache — MOIS EN COURS uniquement.
 *
 * Lot 4 SIMPLIFICATION.md S3.5 (2026-08-03) : plus de période sélectionnable,
 * plus de comparaison « vs période précédente », plus de sparklines, plus de
 * délai moyen d'expédition — les courbes et l'historique vivent dans le
 * dashboard Stripe (cap n°1). Ne restent que les chiffres bruts du mois que
 * Stripe ne présente pas sous l'angle Synclune (CA net après remboursements,
 * file à expédier, finalisation panier, nouveaux clients).
 */
export async function fetchDashboardKpis(): Promise<GetKpisReturn> {
	"use cache";

	cacheDashboard(DASHBOARD_CACHE_TAGS.KPIS);
	cacheTag(ORDERS_CACHE_TAGS.LIST);

	return Sentry.startSpan({ name: "dashboard.fetchKpis", op: "db.read" }, async () => {
		const { currentStart } = getPeriodBoundaries(DEFAULT_PERIOD);

		const [
			currentMonth,
			currentTotalOrders,
			currentPaidCreated,
			pendingShipmentCount,
			currentRefunds,
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
			// Taux de finalisation (ANALYTICS-AUDIT-006) : numérateur ET dénominateur
			// sur la même cohorte `createdAt` (commandes créées dans la période).
			prisma.order.count({
				where: { createdAt: { gte: currentStart }, ...notDeleted },
			}),
			prisma.order.count({
				where: {
					createdAt: { gte: currentStart },
					paymentStatus: { in: [...PAID_REVENUE_STATUSES] },
					...notDeleted,
				},
			}),
			// "À expédier" — prédicat SSOT partagé avec la pastille de navigation
			// (`getAdminNavBadges`).
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
			// Nouveaux clients : clé client (COALESCE userId, email), acquisition au
			// MIN(paidAt). Statuts encaissés (ANALYTICS-AUDIT-001).
			prisma.$queryRaw<NewCustomersRow[]>`
					SELECT COUNT(*) FILTER (WHERE first_paid >= ${currentStart}) AS "currentCount"
					FROM (
						SELECT MIN("paidAt") AS first_paid
						FROM "Order"
						WHERE "paymentStatus" = ANY(${[...PAID_REVENUE_STATUSES]}::"PaymentStatus"[])
							AND "deletedAt" IS NULL
						GROUP BY COALESCE("userId", "customerEmail")
					) firsts
				`,
		]);

		const currentRevenue = currentMonth._sum.total ?? 0;
		const currentRefundAmount = currentRefunds._sum.amount ?? 0;
		const currentNet = currentRevenue - currentRefundAmount;

		const currentCount = currentMonth._count;
		const currentRefundCount = currentRefunds._count;
		const refundRate = currentCount > 0 ? (currentRefundCount / currentCount) * 100 : 0;

		const currentAov = currentCount > 0 ? currentRevenue / currentCount : 0;
		const currentRate =
			currentTotalOrders > 0 ? (currentPaidCreated / currentTotalOrders) * 100 : 0;

		return {
			monthlyRevenue: {
				amount: currentRevenue,
				netAmount: currentNet,
				refundAmount: currentRefundAmount,
				refundCount: currentRefundCount,
				refundRate,
			},
			monthlyOrders: {
				count: currentCount,
			},
			averageOrderValue: {
				amount: currentAov,
			},
			conversionRate: {
				rate: currentRate,
				abandoned: currentTotalOrders - currentPaidCreated,
			},
			pendingShipment: {
				count: pendingShipmentCount,
			},
			discountImpact: {
				amount: currentMonth._sum.discountAmount ?? 0,
			},
			newCustomers: {
				count: Number(newCustomersRows[0]?.currentCount ?? 0),
			},
		};
	});
}
