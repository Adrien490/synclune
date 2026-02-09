/**
 * Cache configuration for Orders module
 */

import { cacheLife, cacheTag } from "next/cache"
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags"

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
 * Tags à invalider lors de la modification d'une commande
 *
 * Invalide automatiquement :
 * - La liste des commandes admin
 * - Les commandes de l'utilisateur (si userId fourni)
 * - La dernière commande de l'utilisateur
 * - Les statistiques du compte utilisateur
 * - Les badges de la sidebar (affecte le count de commandes en attente)
 */
export function getOrderInvalidationTags(userId?: string): string[] {
	const tags: string[] = [ORDERS_CACHE_TAGS.LIST, SHARED_CACHE_TAGS.ADMIN_BADGES]

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
 * Tags à invalider lors de la modification d'un client
 */
export function getCustomerInvalidationTags(): string[] {
	return [ORDERS_CACHE_TAGS.CUSTOMERS_LIST]
}
