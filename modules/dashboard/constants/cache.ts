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

/**
 * Configure le cache pour les stats de ventes avec filtre de periode
 * Cache plus court car les donnees changent selon la periode selectionnee
 */
export function cacheDashboardSales(period: string) {
	cacheLife("dashboard")
	cacheTag(DASHBOARD_CACHE_TAGS.SALES_KPIS(period))
}

/**
 * Configure le cache pour les stats d'inventaire
 * Cache plus long car ces donnees changent moins frequemment
 */
export function cacheDashboardInventoryStats() {
	cacheLife("dashboard")
	cacheTag(DASHBOARD_CACHE_TAGS.INVENTORY_KPIS)
}

/**
 * Configure le cache pour le taux de conversion
 */
export function cacheDashboardConversion(period: string) {
	cacheLife("dashboard")
	cacheTag(DASHBOARD_CACHE_TAGS.CONVERSION_RATE(period))
}

/**
 * Configure le cache pour les revenus par collection
 */
export function cacheDashboardRevenueByCollection(period: string) {
	cacheLife("dashboard")
	cacheTag(DASHBOARD_CACHE_TAGS.REVENUE_COLLECTIONS(period))
}

/**
 * Configure le cache pour les revenus par type de produit
 */
export function cacheDashboardRevenueByType(period: string) {
	cacheLife("dashboard")
	cacheTag(DASHBOARD_CACHE_TAGS.REVENUE_TYPES(period))
}

/**
 * Configure le cache pour le taux d'abandon panier
 */
export function cacheDashboardAbandonment(period: string) {
	cacheLife("dashboard")
	cacheTag(DASHBOARD_CACHE_TAGS.ABANDONMENT_RATE(period))
}

/**
 * Configure le cache pour la valeur du stock
 */
export function cacheDashboardStockValue() {
	cacheLife("dashboard")
	cacheTag(DASHBOARD_CACHE_TAGS.STOCK_VALUE)
}

/**
 * Configure le cache pour les produits jamais vendus
 */
export function cacheDashboardNeverSold() {
	cacheLife("dashboard")
	cacheTag(DASHBOARD_CACHE_TAGS.NEVER_SOLD)
}

/**
 * Configure le cache pour le stock par attribut
 */
export function cacheDashboardStockByColor() {
	cacheLife("dashboard")
	cacheTag(DASHBOARD_CACHE_TAGS.STOCK_BY_COLOR)
}

/**
 * Configure le cache pour le stock par materiau
 */
export function cacheDashboardStockByMaterial() {
	cacheLife("dashboard")
	cacheTag(DASHBOARD_CACHE_TAGS.STOCK_BY_MATERIAL)
}

/**
 * Configure le cache pour les KPIs clients
 */
export function cacheDashboardCustomerKpis(period: string) {
	cacheLife("dashboard")
	cacheTag(DASHBOARD_CACHE_TAGS.CUSTOMER_KPIS(period))
}

/**
 * Configure le cache pour l'acquisition clients
 */
export function cacheDashboardCustomerAcquisition(period: string) {
	cacheLife("dashboard")
	cacheTag(DASHBOARD_CACHE_TAGS.CUSTOMER_ACQUISITION(period))
}

/**
 * Configure le cache pour les clients recurrents
 */
export function cacheDashboardRepeatCustomers(period: string) {
	cacheLife("dashboard")
	cacheTag(DASHBOARD_CACHE_TAGS.REPEAT_CUSTOMERS(period))
}

/**
 * Configure le cache pour les top clients
 */
export function cacheDashboardTopCustomers(period: string) {
	cacheLife("dashboard")
	cacheTag(DASHBOARD_CACHE_TAGS.TOP_CUSTOMERS(period))
}

/**
 * Configure le cache pour les stats remboursements
 */
export function cacheDashboardRefundStats(period: string) {
	cacheLife("dashboard")
	cacheTag(DASHBOARD_CACHE_TAGS.REFUND_STATS(period))
}

/**
 * Configure le cache pour les stats promos
 */
export function cacheDashboardDiscountStats(period: string) {
	cacheLife("dashboard")
	cacheTag(DASHBOARD_CACHE_TAGS.DISCOUNT_STATS(period))
}

/**
 * Configure le cache pour les top codes promo
 */
export function cacheDashboardTopDiscounts(period: string) {
	cacheLife("dashboard")
	cacheTag(DASHBOARD_CACHE_TAGS.TOP_DISCOUNTS(period))
}

/**
 * Configure le cache pour les statuts fulfillment
 */
export function cacheDashboardFulfillmentStatus() {
	cacheLife("dashboard")
	cacheTag(DASHBOARD_CACHE_TAGS.FULFILLMENT_STATUS)
}

/**
 * Configure le cache pour les revenus 12 mois
 */
export function cacheDashboardRevenueYear() {
	cacheLife("dashboard")
	cacheTag(DASHBOARD_CACHE_TAGS.REVENUE_YEAR)
}

// ============================================
// INVALIDATION HELPERS
// ============================================

/**
 * Tags à invalider pour les badges du dashboard
 */
export function getDashboardBadgesInvalidationTags(): string[] {
	return [DASHBOARD_CACHE_TAGS.BADGES]
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
		DASHBOARD_CACHE_TAGS.INVENTORY_LIST,
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
