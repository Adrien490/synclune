import { cacheLife, cacheTag } from "next/cache";
import { getSession } from "@/modules/auth/lib/get-current-session";
import { prisma } from "@/shared/lib/prisma";

import { CART_SELECT_FOR_COUNT } from "../constants/account-stats.constants";
import type {
	AccountStats,
	GetAccountStatsReturn,
} from "../types/account-stats.types";

// Re-export pour compatibilité
export { CART_SELECT_FOR_COUNT } from "../constants/account-stats.constants";
export type {
	AccountStats,
	GetAccountStatsReturn,
} from "../types/account-stats.types";

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Récupère les statistiques du compte utilisateur
 *
 * Le cache est géré dans fetchAccountStats() avec "use cache"
 *
 * Stats calculées:
 * - Nombre total de commandes
 * - Montant total dépensé
 * - Dernière commande
 *
 * @returns Les statistiques du compte ou null si non authentifié
 */
export async function getAccountStats(): Promise<GetAccountStatsReturn> {
	const session = await getSession();

	if (!session?.user?.id) {
		return null;
	}

	return fetchAccountStats(session.user.id);
}

/**
 * Récupère les stats compte depuis la DB avec use cache
 *
 * Utilise "use cache" pour:
 * - Isoler les données par utilisateur (pas de fuite)
 * - Permettre le prefetching runtime (stale >= 30s)
 * - Stockage côté client uniquement (sécurité)
 * - Invalidation lors de nouvelles commandes
 *
 * @param userId - ID de l'utilisateur
 * @returns Les statistiques du compte
 */
export async function fetchAccountStats(userId: string): Promise<AccountStats> {
	"use cache";
	cacheLife("userOrders");
	cacheTag(`account-stats-${userId}`);

	try {
		const [totalOrders, pendingOrders, cart] = await Promise.all([
			prisma.order.count({
				where: {
					userId,
				},
			}),
			prisma.order.count({
				where: {
					userId,
					status: "PROCESSING",
				},
			}),
			prisma.cart.findUnique({
				where: {
					userId,
				},
				select: CART_SELECT_FOR_COUNT,
			}),
		]);

		return {
			totalOrders,
			pendingOrders,
			cartItemsCount: cart?._count.items ?? 0,
		};
	} catch (error) {
		// console.error("[FETCH_ACCOUNT_STATS] Error:", error);
		return {
			totalOrders: 0,
			pendingOrders: 0,
			cartItemsCount: 0,
		};
	}
}
