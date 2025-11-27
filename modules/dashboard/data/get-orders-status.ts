import { isAdmin } from "@/shared/lib/guards";
import { OrderStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { cacheDashboard } from "@/modules/dashboard/constants/cache";

// ============================================================================
// TYPES
// ============================================================================

export type OrderStatusItem = {
	status: OrderStatus;
	count: number;
};

export type GetOrdersStatusReturn = {
	statuses: OrderStatusItem[];
};

// Alias pour compatibilité
export type GetDashboardOrdersStatusReturn = GetOrdersStatusReturn;

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Action serveur pour récupérer la répartition des commandes par statut
 */
export async function getOrdersStatus(): Promise<GetOrdersStatusReturn> {
	const admin = await isAdmin();

	if (!admin) {
		throw new Error("Admin access required");
	}

	return await fetchDashboardOrdersStatus();
}

/**
 * Récupère la répartition des commandes par statut depuis la DB avec cache
 */
export async function fetchDashboardOrdersStatus(): Promise<GetOrdersStatusReturn> {
	"use cache: remote";

	cacheDashboard();

	const statusCounts = await prisma.order.groupBy({
		by: ["status"],
		_count: {
			id: true,
		},
	});

	const statuses = statusCounts.map((item) => ({
		status: item.status,
		count: item._count.id,
	}));

	return { statuses };
}
