/**
 * Cache configuration for Refund module
 *
 * Note: Ce module utilise principalement les tags du module Orders
 * car les remboursements sont liés aux commandes.
 */

import { ORDERS_CACHE_TAGS } from "@/modules/orders/constants/cache"

// ============================================
// CACHE TAGS
// ============================================

// Le module refund utilise les tags de orders
export { ORDERS_CACHE_TAGS }

