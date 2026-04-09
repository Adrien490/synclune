import { PaymentStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { cacheDashboard } from "@/shared/lib/cache";
import { DASHBOARD_CACHE_TAGS } from "@/modules/dashboard/constants/cache";
import type { DashboardPeriod } from "@/modules/dashboard/constants/period.constants";
import { DEFAULT_PERIOD } from "@/modules/dashboard/constants/period.constants";
import { getPeriodBoundaries } from "@/modules/dashboard/services/period-boundaries.service";

import type { GetTopProductsReturn, TopProductItem } from "../types/dashboard.types";

export type { GetTopProductsReturn } from "../types/dashboard.types";

type TopProductRow = {
	productId: string | null;
	productTitle: string;
	productImageUrl: string | null;
	units_sold: bigint;
	revenue: bigint;
};

/**
 * Fetches top 5 selling products for the selected period
 * Uses raw SQL for efficient aggregation across OrderItem + Order
 */
export async function fetchTopProducts(
	period: DashboardPeriod = DEFAULT_PERIOD,
): Promise<GetTopProductsReturn> {
	"use cache";

	cacheDashboard(DASHBOARD_CACHE_TAGS.TOP_PRODUCTS);

	const { currentStart } = getPeriodBoundaries(period);

	const rows = await prisma.$queryRaw<TopProductRow[]>`
		SELECT
			oi."productId",
			oi."productTitle",
			oi."productImageUrl",
			SUM(oi.quantity) as units_sold,
			SUM(oi.price * oi.quantity) as revenue
		FROM "OrderItem" oi
		JOIN "Order" o ON oi."orderId" = o.id
		WHERE o."paidAt" >= ${currentStart}
			AND o."paymentStatus"::text = ${PaymentStatus.PAID}
			AND o."deletedAt" IS NULL
		GROUP BY oi."productId", oi."productTitle", oi."productImageUrl"
		ORDER BY revenue DESC
		LIMIT 5
	`;

	const products: TopProductItem[] = rows.map((row) => ({
		productId: row.productId,
		title: row.productTitle,
		imageUrl: row.productImageUrl,
		unitsSold: Number(row.units_sold),
		revenue: Number(row.revenue),
	}));

	return { products };
}
