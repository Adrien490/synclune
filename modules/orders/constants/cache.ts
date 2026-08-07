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
 * connecté : le détail admin passe par `DETAIL`, et la page de confirmation
 * post-paiement par `CONFIRMATION`.
 *
 * ⚠️ `/suivi-commande` ne pose AUCUN tag : `getOrderForTracking` n'est délibérément
 * pas cachée (entrée = token HMAC opaque, une visite par lien — un cache partagé y
 * serait un risque de fuite cross-commande pour zéro gain). Ne pas la croire
 * couverte par `CONFIRMATION`, comme l'affirmait ce commentaire jusqu'au 2026-08-07.
 *
 * Corollaire sur CACHE-AUDIT-010 : les deux helpers ci-dessous ne prennent plus de
 * `userId`. Le garder en paramètre ignoré aurait laissé croire à une invalidation
 * user-scopée toujours en place.
 */
export const ORDERS_CACHE_TAGS = {
	/** Liste des commandes (dashboard admin) */
	LIST: "orders-list",

	/**
	 * ⚠️ `HISTORY(orderId)` a été RETIRÉ le 2026-08-07 (audit « cache utilisateur et
	 * checkout ») : tag orphelin, invalidé par 4 sites et posé par AUCUN `cacheTag()`.
	 * Son lecteur supposé, `getOrderHistory()`, n'a jamais existé — l'audit trail se
	 * lit via `GET_ORDER_SELECT_ADMIN.history` dans `getOrderById()`, donc sous
	 * `DETAIL(orderId)`. Ne pas le réintroduire sans écrire d'abord son lecteur.
	 */

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
		tags.push(ORDERS_CACHE_TAGS.CONFIRMATION(orderId), ORDERS_CACHE_TAGS.DETAIL(orderId));
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
		tags.push(ORDERS_CACHE_TAGS.CONFIRMATION(orderId), ORDERS_CACHE_TAGS.DETAIL(orderId));
	}

	return tags;
}
