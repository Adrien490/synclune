import * as Sentry from "@sentry/nextjs";
import { cacheTag } from "next/cache";
import { prisma } from "@/shared/lib/prisma";
import { cacheDashboard } from "@/shared/lib/cache";
import { DASHBOARD_CACHE_TAGS } from "@/modules/dashboard/constants/cache";
import { ORDERS_CACHE_TAGS } from "@/modules/orders/constants/cache";
import {
	DEFAULT_PERIOD,
	type DashboardPeriod,
} from "@/modules/dashboard/constants/period.constants";
import { getPeriodBoundaries } from "@/modules/dashboard/services/period-boundaries.service";
import type {
	GetTopProductsReturn,
	TopProductItem,
} from "@/modules/dashboard/types/dashboard.types";

export type { GetTopProductsReturn, TopProductItem } from "../types/dashboard.types";

const TOP_PRODUCTS_LIMIT = 5;

type TopProductRow = {
	productId: string | null;
	product_title: string;
	product_image_url: string | null;
	product_slug: string | null;
	revenue: bigint;
	units_sold: bigint;
};

/**
 * Top 5 products of the period, ranked by revenue.
 *
 * Aggregates OrderItem rows from PAID orders within the requested period.
 * `productTitle`/`productImageUrl` are read from the OrderItem snapshot
 * (preserved even if the product is later soft-deleted), while `productSlug`
 * is joined live from `Product` so the deep-link only renders when the
 * product still exists.
 */
export async function fetchDashboardTopProducts(
	period: DashboardPeriod = DEFAULT_PERIOD,
): Promise<GetTopProductsReturn> {
	"use cache";

	cacheDashboard(DASHBOARD_CACHE_TAGS.TOP_PRODUCTS);
	cacheTag(ORDERS_CACHE_TAGS.LIST);

	return Sentry.startSpan(
		{ name: "dashboard.fetchTopProducts", op: "db.read", attributes: { period } },
		async () => {
			const { currentStart, currentEnd } = getPeriodBoundaries(period);

			const rows = await prisma.$queryRaw<TopProductRow[]>`
				SELECT
					oi."productId" as "productId",
					MAX(oi."productTitle") as product_title,
					MAX(oi."productImageUrl") as product_image_url,
					MAX(p."slug") as product_slug,
					SUM(oi.price * oi.quantity)::BIGINT as revenue,
					SUM(oi.quantity)::BIGINT as units_sold
				FROM "OrderItem" oi
				INNER JOIN "Order" o ON o.id = oi."orderId"
				LEFT JOIN "Product" p ON p.id = oi."productId" AND p."deletedAt" IS NULL
				WHERE o."paymentStatus" = 'PAID'
					AND o."paidAt" >= ${currentStart}
					AND o."paidAt" <= ${currentEnd}
					AND o."deletedAt" IS NULL
				GROUP BY oi."productId"
				ORDER BY revenue DESC
				LIMIT ${TOP_PRODUCTS_LIMIT}
			`;

			const products: TopProductItem[] = rows.map((row) => ({
				productId: row.productId,
				productSlug: row.product_slug,
				title: row.product_title,
				imageUrl: row.product_image_url,
				revenue: Number(row.revenue),
				unitsSold: Number(row.units_sold),
			}));

			return { products };
		},
	);
}
