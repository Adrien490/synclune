import { OrderStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { cacheOrdersDashboard, ORDERS_CACHE_TAGS } from "../constants/cache";

// ============================================================================
// TYPES
// ============================================================================

export type OrderForBulkCancel = Awaited<ReturnType<typeof fetchOrdersForBulkCancel>>[number];

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Récupère les commandes éligibles à l'annulation en masse
 *
 * Filtre automatiquement les commandes déjà annulées.
 * Utilisé par bulk-cancel-orders.ts pour valider et traiter les annulations.
 *
 * @param ids - Liste des IDs de commandes à récupérer
 */
export async function getOrdersForBulkCancel(ids: string[]) {
	return fetchOrdersForBulkCancel(ids);
}

// ============================================================================
// FETCH FUNCTION (CACHED)
// ============================================================================

async function fetchOrdersForBulkCancel(ids: string[]) {
	"use cache";

	cacheOrdersDashboard(ORDERS_CACHE_TAGS.LIST);

	return prisma.order.findMany({
		where: {
			id: { in: ids },
			status: { not: OrderStatus.CANCELLED },
		},
		select: {
			id: true,
			orderNumber: true,
			userId: true,
			paymentStatus: true,
			items: {
				select: {
					skuId: true,
					quantity: true,
				},
			},
		},
	});
}
