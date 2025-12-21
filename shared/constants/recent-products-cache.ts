/**
 * Cache tags pour les produits recemment vus
 */
export const RECENT_PRODUCTS_CACHE_TAGS = {
	/** Tag principal pour les produits recemment vus */
	LIST: "recent-products-list",
} as const

/**
 * Retourne les tags a invalider
 */
export function getRecentProductsInvalidationTags(): string[] {
	return [RECENT_PRODUCTS_CACHE_TAGS.LIST]
}
