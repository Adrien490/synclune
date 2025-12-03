/**
 * Cache configuration for Dashboard module
 *
 * NOTE: Pour les tags partagés (badges, orders list, customers list, inventory list),
 * utiliser SHARED_CACHE_TAGS depuis @/shared/constants/cache-tags
 */

import { cacheLife, cacheTag } from "next/cache"
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags"

// ============================================
// CACHE TAGS
// ============================================

export const DASHBOARD_CACHE_TAGS = {
	// ========== STATS VENTES (parametriques par periode) ==========
	/** Taux de conversion panier -> commande */
	CONVERSION_RATE: (period: string) => `dashboard-conversion-${period}`,
	/** Revenus par collection */
	REVENUE_COLLECTIONS: (period: string) => `dashboard-revenue-collections-${period}`,
	/** Revenus par type de produit */
	REVENUE_TYPES: (period: string) => `dashboard-revenue-types-${period}`,
	/** Taux d'abandon panier */
	ABANDONMENT_RATE: (period: string) => `dashboard-abandonment-${period}`,
	/** Top produits */
	TOP_PRODUCTS: (period: string) => `dashboard-top-products-${period}`,
	/** Graphique revenus */
	REVENUE_CHART: (period: string) => `dashboard-revenue-chart-${period}`,
	/** KPIs de la section ventes */
	SALES_KPIS: (period: string) => `dashboard-sales-kpis-${period}`,

	// ========== STATS CLIENTS (parametriques par periode) ==========
	/** KPIs clients */
	CUSTOMER_KPIS: (period: string) => `dashboard-customer-kpis-${period}`,
	/** Acquisition clients */
	CUSTOMER_ACQUISITION: (period: string) => `dashboard-customer-acquisition-${period}`,
	/** Clients recurrents */
	REPEAT_CUSTOMERS: (period: string) => `dashboard-repeat-customers-${period}`,
	/** Top clients */
	TOP_CUSTOMERS: (period: string) => `dashboard-top-customers-${period}`,

	// ========== STATS REMBOURSEMENTS ==========
	/** Stats remboursements */
	REFUND_STATS: (period: string) => `dashboard-refund-stats-${period}`,

	// ========== STATS PROMOS ==========
	/** Stats codes promo */
	DISCOUNT_STATS: (period: string) => `dashboard-discount-stats-${period}`,
	/** Top codes promo */
	TOP_DISCOUNTS: (period: string) => `dashboard-top-discounts-${period}`,

	// ========== STATS FULFILLMENT ==========
	/** Distribution statuts fulfillment */
	FULFILLMENT_STATUS: "dashboard-fulfillment-status",

	// ========== TENDANCES ==========
	/** Revenus 12 mois */
	REVENUE_YEAR: "dashboard-revenue-year",

	// ========== STATS INVENTAIRE (fixes) ==========
	/** Valeur totale du stock */
	STOCK_VALUE: "dashboard-stock-value",
	/** Turnover ratio par SKU */
	INVENTORY_TURNOVER: (period: string) => `dashboard-turnover-${period}`,
	/** Notifications de retour en stock */
	STOCK_NOTIFICATIONS: "dashboard-stock-notifications",
	/** Produits jamais vendus */
	NEVER_SOLD: "dashboard-never-sold",
	/** Stock par couleur */
	STOCK_BY_COLOR: "dashboard-stock-colors",
	/** Stock par materiau */
	STOCK_BY_MATERIAL: "dashboard-stock-materials",
	/** KPIs de la section inventaire */
	INVENTORY_KPIS: "dashboard-inventory-kpis",
} as const

// ============================================
// CACHE CONFIGURATION HELPER
// ============================================

/**
 * Configure le cache pour les données du dashboard
 * @param tag - Tag de cache optionnel (utiliser DASHBOARD_CACHE_TAGS ou SHARED_CACHE_TAGS)
 */
export function cacheDashboard(tag?: string) {
	cacheLife("dashboard")
	if (tag) {
		cacheTag(tag)
	}
}

// ============================================
// INVALIDATION HELPERS
// ============================================

/**
 * Tags à invalider pour les badges du dashboard
 */
export function getDashboardBadgesInvalidationTags(): string[] {
	return [SHARED_CACHE_TAGS.ADMIN_BADGES]
}

/**
 * Tags à invalider pour les KPIs de ventes (toutes périodes)
 */
export function getSalesKpisInvalidationTags(): string[] {
	const periods = ["today", "yesterday", "last7days", "last30days", "thisMonth", "lastMonth", "thisYear", "lastYear", "custom"]
	return periods.map(p => DASHBOARD_CACHE_TAGS.SALES_KPIS(p))
}

/**
 * Tags à invalider pour l'inventaire
 */
export function getInventoryInvalidationTags(): string[] {
	return [
		DASHBOARD_CACHE_TAGS.INVENTORY_KPIS,
		DASHBOARD_CACHE_TAGS.STOCK_VALUE,
		DASHBOARD_CACHE_TAGS.NEVER_SOLD,
		DASHBOARD_CACHE_TAGS.STOCK_BY_COLOR,
		DASHBOARD_CACHE_TAGS.STOCK_BY_MATERIAL,
		SHARED_CACHE_TAGS.ADMIN_INVENTORY_LIST,
	]
}

/**
 * Tags à invalider pour les revenus (toutes périodes)
 */
export function getRevenueInvalidationTags(): string[] {
	const periods = ["today", "yesterday", "last7days", "last30days", "thisMonth", "lastMonth", "thisYear", "lastYear", "custom"]
	return [
		...periods.map(p => DASHBOARD_CACHE_TAGS.REVENUE_CHART(p)),
		...periods.map(p => DASHBOARD_CACHE_TAGS.REVENUE_COLLECTIONS(p)),
		...periods.map(p => DASHBOARD_CACHE_TAGS.REVENUE_TYPES(p)),
		...periods.map(p => DASHBOARD_CACHE_TAGS.TOP_PRODUCTS(p)),
	]
}

/**
 * Tags à invalider pour l'abandon panier (toutes périodes)
 */
export function getAbandonmentInvalidationTags(): string[] {
	const periods = ["today", "yesterday", "last7days", "last30days", "thisMonth", "lastMonth", "thisYear", "lastYear", "custom"]
	return periods.map(p => DASHBOARD_CACHE_TAGS.ABANDONMENT_RATE(p))
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
