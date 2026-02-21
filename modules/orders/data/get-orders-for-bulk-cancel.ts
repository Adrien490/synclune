import { OrderStatus } from "@/app/generated/prisma/client";
import { prisma, notDeleted } from "@/shared/lib/prisma";

// ============================================================================
// TYPES
// ============================================================================

export type OrderForBulkCancel = Awaited<ReturnType<typeof getOrdersForBulkCancel>>[number];

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Récupère les commandes éligibles à l'annulation en masse
 *
 * Filtre automatiquement les commandes déjà annulées, expédiées et livrées.
 * Reads directly from DB (no cache) since this feeds a mutation.
 *
 * @param ids - Liste des IDs de commandes à récupérer
 */
export async function getOrdersForBulkCancel(ids: string[]) {
	return prisma.order.findMany({
		where: {
			id: { in: ids },
			status: {
				notIn: [OrderStatus.CANCELLED, OrderStatus.SHIPPED, OrderStatus.DELIVERED],
			},
			...notDeleted,
		},
		select: {
			id: true,
			orderNumber: true,
			status: true,
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
