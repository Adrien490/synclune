import { PaymentStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { cacheDashboard } from "@/shared/lib/cache";
import { DASHBOARD_CACHE_TAGS } from "@/modules/dashboard/constants/cache";

import type { GetTopProductsReturn, TopProductItem } from "../types/dashboard.types";

export type { GetTopProductsReturn, TopProductItem } from "../types/dashboard.types";

type TopProductRow = {
	productId: string | null;
	productTitle: string;
	productImageUrl: string | null;
	units_sold: bigint;
	revenue: bigint;
};

/**
 * Fetches top 5 selling products for the current month
 * Uses raw SQL for efficient aggregation across OrderItem + Order
 */
export async function fetchTopProducts(): Promise<GetTopProductsReturn> {
	"use cache";

	cacheDashboard(DASHBOARD_CACHE_TAGS.TOP_PRODUCTS);

	const now = new Date();
	const currentMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

	const rows = await prisma.$queryRaw<TopProductRow[]>`
		SELECT
			oi."productId",
			oi."productTitle",
			oi."productImageUrl",
			SUM(oi.quantity) as units_sold,
			SUM(oi.price * oi.quantity) as revenue
		FROM "OrderItem" oi
		JOIN "Order" o ON oi."orderId" = o.id
		WHERE o."paidAt" >= ${currentMonthStart}
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
