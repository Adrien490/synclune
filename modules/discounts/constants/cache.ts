/**
 * Cache configuration for Discount module
 */

import { cacheLife, cacheTag } from "next/cache"

// ============================================
// CACHE TAGS
// ============================================

export const DISCOUNT_CACHE_TAGS = {
	/** Liste des codes promo */
	LIST: "discounts-list",

	/** Détail d'un code promo spécifique (par ID ou code) */
	DETAIL: (idOrCode: string) => `discount-${idOrCode}`,
} as const

// ============================================
// CACHE CONFIGURATION HELPERS
// ============================================

/**
 * Configure le cache pour les codes promo
 * - Utilisé pour : /admin/marketing/codes-promo
 * - Durée : 5min fraîche, 10min revalidation, 30min expiration
 */
export function cacheDiscounts() {
	cacheLife({ stale: 300, revalidate: 600, expire: 1800 }) // 5min fraîche
	cacheTag(DISCOUNT_CACHE_TAGS.LIST)
}

/**
 * Configure le cache pour un code promo spécifique
 * - Utilisé pour : validation checkout, détail admin
 * - Durée : 5min fraîche, 5min revalidation, 30min expiration
 */
export function cacheDiscountDetail(idOrCode: string) {
	cacheLife({ stale: 300, revalidate: 300, expire: 1800 }) // 5min fraîche
	cacheTag(DISCOUNT_CACHE_TAGS.DETAIL(idOrCode), DISCOUNT_CACHE_TAGS.LIST)
}

// ============================================
// INVALIDATION HELPER
// ============================================

/**
 * Tags à invalider lors de la modification d'un code promo
 *
 * Invalide automatiquement :
 * - La liste des codes promo
 * - Le détail du code promo (si idOrCode fourni)
 */
export function getDiscountInvalidationTags(idOrCode?: string): string[] {
	const tags: string[] = [DISCOUNT_CACHE_TAGS.LIST]

	if (idOrCode) {
		tags.push(DISCOUNT_CACHE_TAGS.DETAIL(idOrCode))
	}

	return tags
}
