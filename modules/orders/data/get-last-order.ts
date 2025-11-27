import { cacheLife, cacheTag } from "next/cache";
import { getSession } from "@/shared/utils/get-session";
import { prisma } from "@/shared/lib/prisma";

import { GET_LAST_ORDER_DEFAULT_SELECT } from "../constants/last-order.constants";
import type { GetLastOrderReturn } from "../types/last-order.types";

// Re-export pour compatibilité
export { GET_LAST_ORDER_DEFAULT_SELECT } from "../constants/last-order.constants";
export type { GetLastOrderReturn } from "../types/last-order.types";

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Récupère la dernière commande de l'utilisateur connecté
 *
 * @returns La dernière commande ou null si non authentifié
 */
export async function getLastOrder(): Promise<GetLastOrderReturn> {
	const session = await getSession();

	if (!session?.user?.id) {
		return null;
	}

	return fetchLastOrder(session.user.id);
}

/**
 * Récupère la dernière commande d'un utilisateur depuis la DB avec cache
 */
export async function fetchLastOrder(
	userId: string
): Promise<GetLastOrderReturn> {
	"use cache: private";
	cacheLife({ stale: 120 });
	cacheTag(`last-order-user-${userId}`);

	try {
		const lastOrder = await prisma.order.findFirst({
			where: {
				userId,
			},
			orderBy: {
				createdAt: "desc",
			},
			select: GET_LAST_ORDER_DEFAULT_SELECT,
		});

		return lastOrder;
	} catch (error) {
		return null;
	}
}
