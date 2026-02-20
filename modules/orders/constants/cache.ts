/**
 * Cache configuration for Orders module
 */

import { cacheLife, cacheTag } from "next/cache"
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags"
import { DASHBOARD_CACHE_TAGS } from "@/modules/dashboard/constants/cache"

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

	/** Statistiques du compte utilisateur (nb commandes, total dépensé) */
	ACCOUNT_STATS: (userId: string) => `account-stats-${userId}`,

	/** Liste des clients (dashboard admin) */
	CUSTOMERS_LIST: "customers-list",

	/** Notes internes d'une commande (admin) */
	NOTES: (orderId: string) => `order-notes-${orderId}`,

	/** Remboursements d'une commande */
	REFUNDS: (orderId: string) => `order-refunds-${orderId}`,
} as const

// ============================================
// CACHE CONFIGURATION HELPERS
// ============================================

/**
 * Configure le cache pour les données admin du dashboard commandes
 * - Utilisé pour : liste admin, détails commande
 * - Durée : 1min fraîche, 30s revalidation, 5min expiration
 * @param tag - Tag de cache optionnel (utiliser ORDERS_CACHE_TAGS ou SHARED_CACHE_TAGS)
 */
export function cacheOrdersDashboard(tag?: string) {
	cacheLife("dashboard")
	if (tag) {
		cacheTag(tag)
	}
}

/**
 * Configure le cache pour les commandes d'un utilisateur
 * - Utilisé pour : /orders, historique commandes client
 * - Durée : 2min fraîche, 1min revalidation, 5min expiration
 */
export function cacheUserOrders(userId: string) {
	cacheLife("userOrders")
	cacheTag(ORDERS_CACHE_TAGS.USER_ORDERS(userId))
}

// ============================================
// INVALIDATION HELPERS
// ============================================

/**
 * Tags à invalider lors d'un changement de statut de commande
 * (création, annulation, changement de statut, suppression)
 *
 * Inclut les badges admin car le count de commandes change
 */
export function getOrderInvalidationTags(userId?: string): string[] {
	const tags: string[] = [
		ORDERS_CACHE_TAGS.LIST,
		SHARED_CACHE_TAGS.ADMIN_BADGES,
		SHARED_CACHE_TAGS.ADMIN_ORDERS_LIST,
		DASHBOARD_CACHE_TAGS.KPIS,
		DASHBOARD_CACHE_TAGS.REVENUE_CHART,
		DASHBOARD_CACHE_TAGS.RECENT_ORDERS,
	]

	if (userId) {
		tags.push(
			ORDERS_CACHE_TAGS.USER_ORDERS(userId),
			ORDERS_CACHE_TAGS.LAST_ORDER(userId),
			ORDERS_CACHE_TAGS.ACCOUNT_STATS(userId)
		)
	}

	return tags
}

/**
 * Tags à invalider pour des modifications de métadonnées
 * (tracking, adresse, notes) qui ne changent PAS les compteurs
 *
 * Exclut ADMIN_BADGES et les KPIs dashboard pour éviter les
 * invalidations inutiles sur des opérations fréquentes
 */
export function getOrderMetadataInvalidationTags(userId?: string): string[] {
	const tags: string[] = [
		ORDERS_CACHE_TAGS.LIST,
		SHARED_CACHE_TAGS.ADMIN_ORDERS_LIST,
	]

	if (userId) {
		tags.push(
			ORDERS_CACHE_TAGS.USER_ORDERS(userId),
			ORDERS_CACHE_TAGS.LAST_ORDER(userId)
		)
	}

	return tags
}

/**
 * Tags à invalider lors de la modification d'un client
 */
export function getCustomerInvalidationTags(): string[] {
	return [ORDERS_CACHE_TAGS.CUSTOMERS_LIST]
}
