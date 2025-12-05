// ============================================================================
// STRATEGY CONSTANTS
// ============================================================================

export const RELATED_PRODUCTS_DEFAULT_LIMIT = 8;

export const RELATED_PRODUCTS_STRATEGY = {
	SAME_COLLECTION: 3,
	SAME_TYPE: 2,
	SIMILAR_COLORS: 2,
	BEST_SELLERS: 1,
} as const;
