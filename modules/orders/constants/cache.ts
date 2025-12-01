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

	/** Liste des clients (dashboard admin) */
	CUSTOMERS_LIST: "customers-list",
} as const

// ============================================
// CACHE CONFIGURATION HELPERS
// ============================================

/**
 * Configure le cache pour les commandes d'un utilisateur
 * - Utilisé pour : /orders, historique commandes client
 * - Durée : 2min fraîche, 1min revalidation, 5min expiration
 */
export function cacheUserOrders(userId: string) {
	cacheLife({ stale: 120, revalidate: 60, expire: 300 }) // 2min
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
 * - Les badges de la sidebar (affecte le count de commandes en attente)
 */
export function getOrderInvalidationTags(userId?: string): string[] {
	const tags: string[] = [ORDERS_CACHE_TAGS.LIST, SHARED_CACHE_TAGS.ADMIN_BADGES]

	if (userId) {
		tags.push(ORDERS_CACHE_TAGS.USER_ORDERS(userId))
	}

	return tags
}

/**
 * Tags à invalider lors de la modification d'un client
 */
export function getCustomerInvalidationTags(): string[] {
	return [ORDERS_CACHE_TAGS.CUSTOMERS_LIST]
}
