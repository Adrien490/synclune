/**
 * Cache configuration for Discount module
 */

import { cacheLife, cacheTag } from "next/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";

// ============================================
// CACHE TAGS
// ============================================

export const DISCOUNT_CACHE_TAGS = {
	/** Liste des codes promo */
	LIST: "discounts-list",

	/** Détail d'un code promo spécifique (par ID) */
	DETAIL: (id: string) => `discount-${id}`,

	/** Compteur d'utilisation d'un code promo */
	USAGE: (discountId: string) => `discount-usage-${discountId}`,
} as const;

// ============================================
// CACHE CONFIGURATION HELPERS
// ============================================

/**
 * Configure le cache pour les codes promo (liste admin)
 * - Utilisé pour : /admin/marketing/codes-promo
 * - Profil "user" : 2min stale, 1min revalidation (cohérence admin)
 */
export function cacheDiscounts() {
	cacheLife("user");
	cacheTag(DISCOUNT_CACHE_TAGS.LIST);
}

/**
 * Configure le cache pour un code promo spécifique côté admin (édition)
 * - Profil "user" : 2min stale, 1min revalidation
 */
export function cacheDiscountDetailAdmin(id: string) {
	cacheLife("user");
	cacheTag(DISCOUNT_CACHE_TAGS.DETAIL(id));
}

/**
 * Configure le cache pour un code promo récupéré par son code (validation checkout)
 * - Profil "checkout" : 1min stale, 30s revalidation
 */
export function cacheDiscountDetail(code: string) {
	cacheLife("checkout");
	cacheTag(DISCOUNT_CACHE_TAGS.DETAIL(code));
}

// ============================================
// INVALIDATION HELPER
// ============================================

/**
 * Tags à invalider lors de la modification d'un code promo
 *
 * Invalide automatiquement :
 * - La liste des codes promo
 * - Le détail du code promo (si id fourni)
 * - L'entrée checkout keyed par code (si code fourni) — `cacheDiscountDetail`
 *   cache la validation checkout sous `discount-${code}`, une mutation qui
 *   n'invalide que l'id laisse cette entrée stale jusqu'à expiration (5 min)
 * - Les badges de la sidebar admin
 */
export function getDiscountInvalidationTags(id?: string, code?: string): string[] {
	const tags: string[] = [DISCOUNT_CACHE_TAGS.LIST, SHARED_CACHE_TAGS.ADMIN_BADGES];

	if (id) {
		tags.push(DISCOUNT_CACHE_TAGS.DETAIL(id));
	}

	if (code) {
		tags.push(DISCOUNT_CACHE_TAGS.DETAIL(code));
	}

	return tags;
}
