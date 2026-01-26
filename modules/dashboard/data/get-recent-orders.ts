import { PaymentStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { cacheDashboard } from "@/modules/dashboard/constants/cache";
import { transformRecentOrders } from "../services/recent-orders-transformer.service";

import {
	GET_DASHBOARD_RECENT_ORDERS_SELECT,
	DASHBOARD_RECENT_ORDERS_LIMIT,
} from "../constants/dashboard.constants";
import type {
	RecentOrderItem,
	GetRecentOrdersReturn,
} from "../types/dashboard.types";

// Re-export pour compatibilité
export type {
	RecentOrderItem,
	GetRecentOrdersReturn,
} from "../types/dashboard.types";

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Récupère les 5 dernières commandes depuis la DB avec cache
 */
export async function fetchDashboardRecentOrders(): Promise<GetRecentOrdersReturn> {
	"use cache: remote";

	cacheDashboard();

	// Exclure les commandes non payees (Stripe checkout abandonnes) et supprimees
	const orders = await prisma.order.findMany({
		where: {
			paymentStatus: PaymentStatus.PAID,
			deletedAt: null,
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
}
