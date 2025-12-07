import { isAdmin } from "@/modules/auth/utils/guards";
import { PaymentStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { cacheDashboard } from "@/modules/dashboard/constants/cache";

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

// Alias pour compatibilité avec les imports existants
export type GetDashboardRecentOrdersReturn = GetRecentOrdersReturn;

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Action serveur pour récupérer les 5 dernières commandes
 */
export async function getRecentOrders(): Promise<GetRecentOrdersReturn> {
	const admin = await isAdmin();

	if (!admin) {
		throw new Error("Admin access required");
	}

	return await fetchDashboardRecentOrders();
}

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
		orders: orders.map((order) => ({
			id: order.id,
			orderNumber: order.orderNumber,
			createdAt: order.createdAt,
			status: order.status,
			paymentStatus: order.paymentStatus,
			total: order.total,
			customerName: order.user?.name || "Invité",
			customerEmail: order.user?.email || "",
		})),
	};
}
