/**
 * Cache configuration for Discount module
 */

import { cacheLife, cacheTag } from "next/cache"
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags"

// ============================================
// CACHE TAGS
// ============================================

export const DISCOUNT_CACHE_TAGS = {
	/** Liste des codes promo */
	LIST: "discounts-list",

	/** Détail d'un code promo spécifique (par ID ou code) */
	DETAIL: (idOrCode: string) => `discount-${idOrCode}`,

	/** Compteur d'utilisation d'un code promo */
	USAGE: (discountId: string) => `discount-usage-${discountId}`,
} as const

// ============================================
// CACHE CONFIGURATION HELPERS
// ============================================

/**
 * Configure le cache pour les codes promo
 * - Utilisé pour : /admin/marketing/codes-promo
 * - Profil "cart" : 5min stale, 1min revalidation
 */
export function cacheDiscounts() {
	cacheLife("cart")
	cacheTag(DISCOUNT_CACHE_TAGS.LIST)
}

/**
 * Configure le cache pour un code promo spécifique
 * - Utilisé pour : validation checkout, détail admin
 * - Durée : 5min fraîche, 5min revalidation, 30min expiration
 */
export function cacheDiscountDetail(idOrCode: string) {
	cacheLife("cart")
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
 * - Les badges de la sidebar admin
 */
export function getDiscountInvalidationTags(idOrCode?: string): string[] {
	const tags: string[] = [DISCOUNT_CACHE_TAGS.LIST, SHARED_CACHE_TAGS.ADMIN_BADGES]

	if (idOrCode) {
		tags.push(DISCOUNT_CACHE_TAGS.DETAIL(idOrCode))
	}

	return tags
}
