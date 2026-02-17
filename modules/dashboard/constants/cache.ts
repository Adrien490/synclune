/**
 * Cache configuration for Dashboard module
 */

import { cacheDefault } from "@/shared/lib/cache";

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

// ============================================
// CACHE CONFIGURATION HELPER
// ============================================

/**
 * Configure cache for dashboard data.
 * Uses the "dashboard" profile (1min stale, 30s revalidate, 5min expire).
 * @param tag - Cache tag for targeted invalidation (use DASHBOARD_CACHE_TAGS)
 */
export function cacheDashboard(tag: string) {
	cacheDefault(tag);
}
