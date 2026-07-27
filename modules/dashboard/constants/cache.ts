/**
 * Cache configuration for Dashboard module
 */

// ============================================
// CACHE TAGS
// ============================================

/**
 * Tags used by the dashboard data functions.
 * These are the actual tags applied to cache entries
 * and can be invalidated with updateTag().
 */
export const DASHBOARD_CACHE_TAGS = {
	KPIS: "dashboard-kpis",
	REVENUE_CHART: "dashboard-revenue-chart",
	RECENT_ORDERS: "dashboard-recent-orders",
	ALERTS: "dashboard-alerts",
	TOP_PRODUCTS: "dashboard-top-products",
	REVIEW_HEALTH: "dashboard-review-health",
	VAT_PROGRESS: "dashboard-vat-progress",
} as const;
