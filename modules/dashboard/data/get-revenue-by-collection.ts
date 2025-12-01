import { prisma } from "@/shared/lib/prisma";
import { cacheDashboardRevenueByCollection } from "../constants/cache";
import type { GetRevenueByCollectionReturn } from "../types/dashboard.types";
import {
	resolvePeriodToDates,
	type DashboardPeriod,
} from "../utils/period-resolver";

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Calcule les revenus par collection pour une periode donnee
 * Optimise avec agregation SQL cote DB (evite de charger tous les OrderItems en memoire)
 */
export async function fetchRevenueByCollection(
	period: DashboardPeriod,
	customStartDate?: Date,
	customEndDate?: Date
): Promise<GetRevenueByCollectionReturn> {
	"use cache: remote";

	cacheDashboardRevenueByCollection(period);

	const { startDate, endDate } = resolvePeriodToDates(
		period,
		customStartDate,
		customEndDate
	);

	// Requete SQL optimisee avec agregation cote DB
	// Note: Un produit peut appartenir a plusieurs collections, donc le revenu
	// est attribue a chaque collection (appartenances multiples comptees)
	const collectionsData = await prisma.$queryRaw<
		Array<{
			collectionId: string;
			collectionName: string;
			collectionSlug: string;
			revenue: bigint;
			ordersCount: bigint;
			unitsSold: bigint;
		}>
	>`
    SELECT
      c.id as "collectionId",
      c.name as "collectionName",
      c.slug as "collectionSlug",
      COALESCE(SUM(oi.price * oi.quantity), 0) as revenue,
      COUNT(DISTINCT o.id) as "ordersCount",
      COALESCE(SUM(oi.quantity), 0) as "unitsSold"
    FROM "Collection" c
    INNER JOIN "ProductCollection" pc ON pc."collectionId" = c.id
    INNER JOIN "Product" p ON p.id = pc."productId"
    INNER JOIN "OrderItem" oi ON oi."productId" = p.id
    INNER JOIN "Order" o ON o.id = oi."orderId"
    WHERE o."paymentStatus" = 'PAID'
      AND o."createdAt" >= ${startDate}
      AND o."createdAt" <= ${endDate}
    GROUP BY c.id, c.name, c.slug
    ORDER BY revenue DESC
  `;

	// Total et produits sans collection (uncategorized)
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
        CASE WHEN NOT EXISTS (
          SELECT 1 FROM "ProductCollection" pc WHERE pc."productId" = oi."productId"
        ) THEN oi.price * oi.quantity ELSE 0 END
      ), 0) as "uncategorizedRevenue"
    FROM "OrderItem" oi
    INNER JOIN "Order" o ON o.id = oi."orderId"
    WHERE o."paymentStatus" = 'PAID'
      AND o."createdAt" >= ${startDate}
      AND o."createdAt" <= ${endDate}
      AND oi."productId" IS NOT NULL
  `;

	return {
		collections: collectionsData.map((c) => ({
			collectionId: c.collectionId,
			collectionName: c.collectionName,
			collectionSlug: c.collectionSlug,
			revenue: Number(c.revenue),
			ordersCount: Number(c.ordersCount),
			unitsSold: Number(c.unitsSold),
		})),
		uncategorizedRevenue: Number(totals[0].uncategorizedRevenue),
		totalRevenue: Number(totals[0].totalRevenue),
	};
}
