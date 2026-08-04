/**
 * Cache configuration for Orders module
 */

import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";

// ============================================
// CACHE TAGS
// ============================================

/**
 * ⚠️ Plus aucun tag user-scopé ici (retrait de l'espace client 2026-07-31).
 *
 * `USER_ORDERS(userId)`, `LAST_ORDER(userId)` et `USERS_CACHE_TAGS.USER_ORDERS_COUNT(userId)`
 * ont disparu avec les seules entrées de cache qu'ils invalidaient — `getUserOrders`,
 * `getLastOrder` et `getUserDetailAdmin`. Une commande n'a plus de propriétaire
 * connecté : le suivi passe par `/suivi-commande` (token HMAC, tag `CONFIRMATION`)
 * et le détail admin par `DETAIL`.
 *
 * Corollaire sur CACHE-AUDIT-010 : les deux helpers ci-dessous ne prennent plus de
 * `userId`. Le garder en paramètre ignoré aurait laissé croire à une invalidation
 * user-scopée toujours en place.
 */
export const ORDERS_CACHE_TAGS = {
	/** Liste des commandes (dashboard admin) */
	LIST: "orders-list",

	/** Historique d'une commande spécifique (audit trail) */
	HISTORY: (orderId: string) => `order-history-${orderId}`,

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
export function getOrderInvalidationTags(orderId?: string): string[] {
	const tags: string[] = [
		ORDERS_CACHE_TAGS.LIST,
		SHARED_CACHE_TAGS.ADMIN_BADGES,
		SHARED_CACHE_TAGS.ADMIN_ORDERS_LIST,
	];

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
export function getOrderMetadataInvalidationTags(orderId?: string): string[] {
	const tags: string[] = [ORDERS_CACHE_TAGS.LIST, SHARED_CACHE_TAGS.ADMIN_ORDERS_LIST];

	if (orderId) {
		tags.push(
			ORDERS_CACHE_TAGS.HISTORY(orderId),
			ORDERS_CACHE_TAGS.CONFIRMATION(orderId),
			ORDERS_CACHE_TAGS.DETAIL(orderId),
		);
	}

	return tags;
}
