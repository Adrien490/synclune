import { isAdmin } from "@/modules/auth/utils/guards";
import { OrderStatus, PaymentStatus } from "@/app/generated/prisma";
import { prisma } from "@/shared/lib/prisma";
import { cacheDashboard } from "@/modules/dashboard/constants/cache";
import type { OrderStatusCount } from "../types/dashboard.types";

// Types locaux simplifiés pour ce cas d'usage spécifique
// (le type central GetOrdersStatusReturn inclut plus de détails)
export type OrderStatusItem = OrderStatusCount;

export type GetOrdersStatusReturn = {
	statuses: OrderStatusItem[];
};

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

	// Exclure les commandes non payees (Stripe checkout abandonnes)
	const statusCounts = await prisma.order.groupBy({
		by: ["status"],
		where: {
			paymentStatus: PaymentStatus.PAID,
		},
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
