/**
 * Cache tags pour les recherches recentes
 */
export const RECENT_SEARCHES_CACHE_TAGS = {
	/** Tag principal pour les recherches recentes */
	LIST: "recent-searches-list",
} as const

/**
 * Retourne les tags a invalider
 */
export function getRecentSearchesInvalidationTags(): string[] {
	return [RECENT_SEARCHES_CACHE_TAGS.LIST]
}
