/**
 * Cache configuration for Refund module
 *
 * Note: Ce module utilise principalement les tags du module Orders
 * car les remboursements sont liés aux commandes.
 */

import { ORDERS_CACHE_TAGS, getOrderInvalidationTags } from "@/modules/orders/constants/cache"
import { DASHBOARD_CACHE_TAGS } from "@/modules/dashboard/constants/cache"

// ============================================
// CACHE TAGS
// ============================================

// Le module refund utilise les tags de orders
export { ORDERS_CACHE_TAGS }

// ============================================
// INVALIDATION HELPER
// ============================================

/**
 * Tags à invalider lors d'un remboursement
 *
 * Invalide automatiquement :
 * - La liste des commandes admin
 * - Les commandes de l'utilisateur (si userId fourni)
 * - Les badges de la sidebar
 */
export function getRefundInvalidationTags(userId?: string): string[] {
	return [...getOrderInvalidationTags(userId), DASHBOARD_CACHE_TAGS.BADGES]
}
