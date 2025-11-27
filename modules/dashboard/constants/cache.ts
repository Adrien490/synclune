/**
 * Cache configuration for Dashboard module
 */

import { cacheLife, cacheTag } from "next/cache"

// ============================================
// CACHE TAGS
// ============================================

export const DASHBOARD_CACHE_TAGS = {
	/** Badges de la sidebar (counts pour notifications) */
	BADGES: "dashboard-badges",
	/** Liste des commandes (dashboard admin) */
	ORDERS_LIST: "orders-list",
	/** Liste des clients (dashboard admin) */
	CUSTOMERS_LIST: "customers-list",
	/** Liste de l'inventaire (dashboard admin) */
	INVENTORY_LIST: "inventory-list",
} as const

// ============================================
// CACHE CONFIGURATION HELPERS
// ============================================

/**
 * Configure le cache pour les données du dashboard
 * - Utilisé pour : listes admin (commandes, clients, etc.)
 * - Durée : 1min fraîche, 30s revalidation, 5min expiration
 */
export function cacheDashboard() {
	cacheLife("dashboard")
}

/**
 * Configure le cache pour la liste des commandes admin
 */
export function cacheDashboardOrders() {
	cacheDashboard()
	cacheTag(DASHBOARD_CACHE_TAGS.ORDERS_LIST)
}

/**
 * Configure le cache pour la liste des clients admin
 */
export function cacheDashboardCustomers() {
	cacheDashboard()
	cacheTag(DASHBOARD_CACHE_TAGS.CUSTOMERS_LIST)
}

/**
 * Configure le cache pour la liste d'inventaire admin
 */
export function cacheDashboardInventory() {
	cacheDashboard()
	cacheTag(DASHBOARD_CACHE_TAGS.INVENTORY_LIST)
}

// ============================================
// INVALIDATION HELPER
// ============================================

/**
 * Tags à invalider pour les badges du dashboard
 */
export function getDashboardBadgesInvalidationTags(): string[] {
	return [DASHBOARD_CACHE_TAGS.BADGES]
}

// ============================================
// CHANGELOG CACHE
// ============================================

/**
 * Tags de cache pour les changelogs
 */
export const CHANGELOG_CACHE_TAGS = {
	/** Liste de tous les changelogs */
	LIST: "changelogs",
} as const

/**
 * Configure le cache pour les changelogs
 * - Utilisé pour : liste des versions du changelog
 * - Durée : 1j fraîche, 1h revalidation, 7j expiration
 */
export function cacheChangelogs() {
	cacheLife("changelog")
	cacheTag(CHANGELOG_CACHE_TAGS.LIST)
}

/**
 * Tags à invalider pour les changelogs
 */
export function getChangelogInvalidationTags(): string[] {
	return [CHANGELOG_CACHE_TAGS.LIST]
}
