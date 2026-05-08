import { ProductStatus, RefundStatus } from "@/app/generated/prisma/client";
import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/shared/lib/prisma";
import { cacheDashboard } from "@/shared/lib/cache";
import { DASHBOARD_CACHE_TAGS } from "@/modules/dashboard/constants/cache";
import { LOW_STOCK_THRESHOLD } from "@/modules/products/constants/product.constants";

import type { DashboardAlerts } from "../types/dashboard.types";

export type { DashboardAlerts } from "../types/dashboard.types";

/**
 * Fetches actionable alert counts for the dashboard
 * Returns 0 for all counts if there are no issues requiring attention
 */
export async function fetchDashboardAlerts(): Promise<DashboardAlerts> {
	"use cache";

	cacheDashboard(DASHBOARD_CACHE_TAGS.ALERTS);

	return Sentry.startSpan({ name: "dashboard.fetchAlerts", op: "db.read" }, async () => {
		const [pendingRefunds, lowStockSkus] = await Promise.all([
			prisma.refund.count({
				where: { status: RefundStatus.PENDING },
			}),
			prisma.productSku.count({
				where: {
					isActive: true,
					inventory: { lte: LOW_STOCK_THRESHOLD },
					product: {
						status: ProductStatus.PUBLIC,
						deletedAt: null,
					},
				},
			}),
		]);

		return { pendingRefunds, lowStockSkus };
	});
}
