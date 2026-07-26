/**
 * Cache configuration for Orders module
 */

import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { USERS_CACHE_TAGS } from "@/modules/users/constants/cache";

// ============================================
// CACHE TAGS
// ============================================

export const ORDERS_CACHE_TAGS = {
	/** Liste des commandes (dashboard admin) */
	LIST: "orders-list",

	/** Commandes d'un utilisateur spécifique */
	USER_ORDERS: (userId: string) => `orders-user-${userId}`,

	/** Dernière commande d'un utilisateur (page confirmation, espace client) */
	LAST_ORDER: (userId: string) => `last-order-user-${userId}`,

	/** Historique d'une commande spécifique (audit trail) */
	HISTORY: (orderId: string) => `order-history-${orderId}`,

	/** Notes internes d'une commande (admin) */
	NOTES: (orderId: string) => `order-notes-${orderId}`,

	/** Remboursements d'une commande */
	REFUNDS: (orderId: string) => `order-refunds-${orderId}`,

	/** Commande pour page de confirmation post-paiement (public, double-lookup id+orderNumber) */
	CONFIRMATION: (orderId: string) => `order-confirmation-${orderId}`,

	/** Détail admin d'une commande (page /admin/ventes/commandes/[id]) — tag granulaire pour éviter d'invalider tout `ADMIN_ORDERS_LIST` (ORD-CACHE-001) */
	DETAIL: (orderId: string) => `order-detail-${orderId}`,
} as const;

// ============================================
// INVALIDATION HELPERS
// ============================================

/**
 * Tags à invalider lors d'un changement de statut de commande
 * (création, annulation, changement de statut, suppression)
 *
 * Inclut les badges admin car le count de commandes change
 */
export function getOrderInvalidationTags(userId?: string, orderId?: string): string[] {
	const tags: string[] = [
		ORDERS_CACHE_TAGS.LIST,
		SHARED_CACHE_TAGS.ADMIN_BADGES,
		SHARED_CACHE_TAGS.ADMIN_ORDERS_LIST,
	];

	if (userId) {
		tags.push(
			ORDERS_CACHE_TAGS.USER_ORDERS(userId),
			ORDERS_CACHE_TAGS.LAST_ORDER(userId),
			// CACHE-AUDIT-008 : SSOT (cf. modules/users/data/get-user-detail-admin.ts)
			USERS_CACHE_TAGS.USER_ORDERS_COUNT(userId),
		);
	}

	if (orderId) {
		tags.push(
			ORDERS_CACHE_TAGS.HISTORY(orderId),
			ORDERS_CACHE_TAGS.CONFIRMATION(orderId),
			ORDERS_CACHE_TAGS.DETAIL(orderId),
		);
	}

	return tags;
}

/**
 * Tags à invalider pour des modifications de métadonnées
 * (tracking, adresse, notes) qui ne changent PAS les compteurs
 *
 * Exclut ADMIN_BADGES et les KPIs dashboard pour éviter les
 * invalidations inutiles sur des opérations fréquentes
 */
export function getOrderMetadataInvalidationTags(userId?: string, orderId?: string): string[] {
	const tags: string[] = [ORDERS_CACHE_TAGS.LIST, SHARED_CACHE_TAGS.ADMIN_ORDERS_LIST];

	if (userId) {
		tags.push(ORDERS_CACHE_TAGS.USER_ORDERS(userId), ORDERS_CACHE_TAGS.LAST_ORDER(userId));
	}

	if (orderId) {
		tags.push(
			ORDERS_CACHE_TAGS.HISTORY(orderId),
			ORDERS_CACHE_TAGS.CONFIRMATION(orderId),
			ORDERS_CACHE_TAGS.DETAIL(orderId),
		);
	}

	return tags;
}
