import { isAdmin } from "@/modules/auth/utils/guards";
import { prisma } from "@/shared/lib/prisma";
import { cacheDashboardFulfillmentStatus } from "../constants/cache";
import type { GetFulfillmentStatusReturn, FulfillmentStatusCount } from "../types/dashboard.types";

// Re-export pour compatibilite
export type { GetFulfillmentStatusReturn } from "../types/dashboard.types";

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Action serveur pour recuperer la distribution des statuts de fulfillment
 */
export async function getFulfillmentStatus(): Promise<GetFulfillmentStatusReturn> {
	const admin = await isAdmin();

	if (!admin) {
		throw new Error("Admin access required");
	}

	return await fetchFulfillmentStatus();
}

/**
 * Recupere la distribution des statuts de fulfillment depuis la DB avec cache
 */
export async function fetchFulfillmentStatus(): Promise<GetFulfillmentStatusReturn> {
	"use cache: remote";

	cacheDashboardFulfillmentStatus();

	const statusCounts = await prisma.order.groupBy({
		by: ["fulfillmentStatus"],
		_count: {
			id: true,
		},
	});

	const statuses: FulfillmentStatusCount[] = statusCounts.map((item) => ({
		status: item.fulfillmentStatus,
		count: item._count.id,
	}));

	return { statuses };
}
