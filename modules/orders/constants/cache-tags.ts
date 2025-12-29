/**
 * Cache tags for Orders module
 *
 * Ces constantes peuvent etre importees depuis n'importe quel fichier
 * (client ou server) car elles ne dependent pas de cacheLife/cacheTag.
 */

import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";

// ============================================
// CACHE TAGS
// ============================================

export const ORDERS_CACHE_TAGS = {
	/** Liste des commandes (dashboard admin) */
	LIST: "orders-list",

	/** Commandes d'un utilisateur specifique */
	USER_ORDERS: (userId: string) => `orders-user-${userId}`,

	/** Derniere commande d'un utilisateur (page confirmation, espace client) */
	LAST_ORDER: (userId: string) => `last-order-user-${userId}`,

	/** Statistiques du compte utilisateur (nb commandes, total depense) */
	ACCOUNT_STATS: (userId: string) => `account-stats-${userId}`,

	/** Liste des clients (dashboard admin) */
	CUSTOMERS_LIST: "customers-list",

	/** Notes internes d'une commande (admin) */
	NOTES: (orderId: string) => `order-notes-${orderId}`,

	/** Remboursements d'une commande */
	REFUNDS: (orderId: string) => `order-refunds-${orderId}`,

	/** Historique d'une commande (audit trail) */
	HISTORY: (orderId: string) => `order-history-${orderId}`,
} as const;

// ============================================
// INVALIDATION HELPERS
// ============================================

/**
 * Tags a invalider lors de la modification d'une commande
 *
 * Invalide automatiquement :
 * - La liste des commandes admin
 * - Les commandes de l'utilisateur (si userId fourni)
 * - La derniere commande de l'utilisateur
 * - Les statistiques du compte utilisateur
 * - Les badges de la sidebar (affecte le count de commandes en attente)
 */
export function getOrderInvalidationTags(userId?: string): string[] {
	const tags: string[] = [ORDERS_CACHE_TAGS.LIST, SHARED_CACHE_TAGS.ADMIN_BADGES];

	if (userId) {
		tags.push(
			ORDERS_CACHE_TAGS.USER_ORDERS(userId),
			ORDERS_CACHE_TAGS.LAST_ORDER(userId),
			ORDERS_CACHE_TAGS.ACCOUNT_STATS(userId)
		);
	}

	return tags;
}

/**
 * Tags a invalider lors de la modification d'un client
 */
export function getCustomerInvalidationTags(): string[] {
	return [ORDERS_CACHE_TAGS.CUSTOMERS_LIST];
}
