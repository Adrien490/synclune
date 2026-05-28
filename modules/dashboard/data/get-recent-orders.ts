import * as Sentry from "@sentry/nextjs";
import { cacheTag } from "next/cache";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { cacheDashboard } from "@/shared/lib/cache";
import { DASHBOARD_CACHE_TAGS } from "@/modules/dashboard/constants/cache";
import { ORDERS_CACHE_TAGS } from "@/modules/orders/constants/cache";
import { PAID_REVENUE_STATUSES } from "@/modules/orders/constants/revenue-status.constants";
import { transformRecentOrders } from "../services/recent-orders-transformer.service";

import {
	GET_DASHBOARD_RECENT_ORDERS_SELECT,
	DASHBOARD_RECENT_ORDERS_LIMIT,
} from "../constants/dashboard.constants";
import type { GetRecentOrdersReturn } from "../types/dashboard.types";

// Re-export pour compatibilité
export type { RecentOrderItem, GetRecentOrdersReturn } from "../types/dashboard.types";

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Récupère les 5 dernières commandes depuis la DB avec cache
 */
export async function fetchDashboardRecentOrders(): Promise<GetRecentOrdersReturn> {
	"use cache";

	cacheDashboard(DASHBOARD_CACHE_TAGS.RECENT_ORDERS);
	cacheTag(ORDERS_CACHE_TAGS.LIST);

	return Sentry.startSpan({ name: "dashboard.fetchRecentOrders", op: "db.read" }, async () => {
		const orders = await prisma.order.findMany({
			where: {
				// Inclut les commandes remboursées (encaissées) — ANALYTICS-AUDIT-001.
				// Le badge `paymentStatus` rend la distinction visible dans la liste.
				paymentStatus: { in: [...PAID_REVENUE_STATUSES] },
				...notDeleted,
			},
			take: DASHBOARD_RECENT_ORDERS_LIMIT,
			orderBy: {
				paidAt: "desc",
			},
			select: GET_DASHBOARD_RECENT_ORDERS_SELECT,
		});

		return {
			orders: transformRecentOrders(orders),
		};
	});
}
