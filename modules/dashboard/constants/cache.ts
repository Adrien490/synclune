/**
 * Cache configuration for Dashboard module
 */

// ============================================
// CACHE TAGS
// ============================================

/**
 * Tags posés par les fetchers `modules/dashboard/data/*`.
 *
 * ⚠️ Chaque entrée doit être posée par un `cacheTag()`/`cacheDashboard(tag)` d'un
 * fetcher réel. `refresh-dashboard.ts` invalide `Object.values(...)` en bloc :
 * une constante sans lecteur produit une invalidation dans le vide, invisible.
 *
 * `REVENUE_CHART` et `TOP_PRODUCTS` ont été retirés à ce titre (audit cache
 * 2026-07-31) — aucun `cacheTag` ne les posait, 2 des 6 busts du bouton
 * « Rafraîchir » ne servaient donc à rien. Réintroduire l'entrée EN MÊME TEMPS que
 * le fetcher qui la pose, jamais avant.
 */
export const DASHBOARD_CACHE_TAGS = {
	KPIS: "dashboard-kpis",
	RECENT_ORDERS: "dashboard-recent-orders",
	ALERTS: "dashboard-alerts",
	VAT_PROGRESS: "dashboard-vat-progress",
} as const;
