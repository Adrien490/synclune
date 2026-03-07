/**
 * Cache configuration for Dashboard module
 */

// ============================================
// CACHE TAGS
// ============================================

/**
 * Tags used by the 3 dashboard data functions.
 * These are the actual tags applied to cache entries
 * and can be invalidated with updateTag().
 */
export const DASHBOARD_CACHE_TAGS = {
	KPIS: "dashboard-kpis",
	REVENUE_CHART: "dashboard-revenue-chart",
	RECENT_ORDERS: "dashboard-recent-orders",
} as const;
