import { prisma } from "@/shared/lib/prisma";
import { cacheDashboard, DASHBOARD_CACHE_TAGS } from "../constants/cache";
import type { GetRevenueByTypeReturn } from "../types/dashboard.types";
import {
	resolvePeriodToDates,
	type DashboardPeriod,
} from "../utils/period-resolver";

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Calcule les revenus par type de produit pour une periode donnee
 * Optimise avec agregation SQL cote DB (evite de charger tous les OrderItems en memoire)
 */
export async function fetchRevenueByType(
	period: DashboardPeriod,
	customStartDate?: Date,
	customEndDate?: Date
): Promise<GetRevenueByTypeReturn> {
	"use cache";

	cacheDashboard(DASHBOARD_CACHE_TAGS.REVENUE_TYPES(period));

	const { startDate, endDate } = resolvePeriodToDates(
		period,
		customStartDate,
		customEndDate
	);

	// Requete SQL optimisee avec agregation cote DB
	const typesData = await prisma.$queryRaw<
		Array<{
			typeId: string;
			typeLabel: string;
			typeSlug: string;
			revenue: bigint;
			ordersCount: bigint;
			unitsSold: bigint;
		}>
	>`
    SELECT
      pt.id as "typeId",
      pt.label as "typeLabel",
      pt.slug as "typeSlug",
      COALESCE(SUM(oi.price * oi.quantity), 0) as revenue,
      COUNT(DISTINCT o.id) as "ordersCount",
      COALESCE(SUM(oi.quantity), 0) as "unitsSold"
    FROM "ProductType" pt
    INNER JOIN "Product" p ON p."typeId" = pt.id
    INNER JOIN "OrderItem" oi ON oi."productId" = p.id
    INNER JOIN "Order" o ON o.id = oi."orderId"
    WHERE o."paymentStatus" = 'PAID'
      AND o."paidAt" >= ${startDate}
      AND o."paidAt" <= ${endDate}
      AND o."deletedAt" IS NULL
    GROUP BY pt.id, pt.label, pt.slug
    ORDER BY revenue DESC
  `;

	// Total et produits sans type (uncategorized)
	const totals = await prisma.$queryRaw<
		[
			{
				totalRevenue: bigint;
				uncategorizedRevenue: bigint;
			},
		]
	>`
    SELECT
      COALESCE(SUM(oi.price * oi.quantity), 0) as "totalRevenue",
      COALESCE(SUM(
        CASE WHEN p."typeId" IS NULL THEN oi.price * oi.quantity ELSE 0 END
      ), 0) as "uncategorizedRevenue"
    FROM "OrderItem" oi
    INNER JOIN "Order" o ON o.id = oi."orderId"
    LEFT JOIN "Product" p ON p.id = oi."productId"
    WHERE o."paymentStatus" = 'PAID'
      AND o."paidAt" >= ${startDate}
      AND o."paidAt" <= ${endDate}
      AND o."deletedAt" IS NULL
      AND oi."productId" IS NOT NULL
  `;

	return {
		types: typesData.map((t) => ({
			typeId: t.typeId,
			typeLabel: t.typeLabel,
			typeSlug: t.typeSlug,
			revenue: Number(t.revenue),
			ordersCount: Number(t.ordersCount),
			unitsSold: Number(t.unitsSold),
		})),
		uncategorizedRevenue: Number(totals[0].uncategorizedRevenue),
		totalRevenue: Number(totals[0].totalRevenue),
	};
}
