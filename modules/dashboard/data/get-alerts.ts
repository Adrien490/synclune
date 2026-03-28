import {
	CustomizationRequestStatus,
	DisputeStatus,
	ProductStatus,
	RefundStatus,
} from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { cacheDashboard } from "@/shared/lib/cache";
import { DASHBOARD_CACHE_TAGS } from "@/modules/dashboard/constants/cache";

import type { DashboardAlerts } from "../types/dashboard.types";

export type { DashboardAlerts } from "../types/dashboard.types";

const LOW_STOCK_THRESHOLD = 3;

/**
 * Fetches actionable alert counts for the dashboard
 * Returns 0 for all counts if there are no issues requiring attention
 */
export async function fetchDashboardAlerts(): Promise<DashboardAlerts> {
	"use cache";

	cacheDashboard(DASHBOARD_CACHE_TAGS.ALERTS);

	const [pendingRefunds, activeDisputes, lowStockSkus, pendingCustomizations] = await Promise.all([
		prisma.refund.count({
			where: { status: RefundStatus.PENDING },
		}),
		prisma.dispute.count({
			where: {
				status: {
					in: [DisputeStatus.NEEDS_RESPONSE, DisputeStatus.UNDER_REVIEW],
				},
			},
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
		prisma.customizationRequest.count({
			where: {
				status: CustomizationRequestStatus.PENDING,
				deletedAt: null,
			},
		}),
	]);

	return { pendingRefunds, activeDisputes, lowStockSkus, pendingCustomizations };
}
