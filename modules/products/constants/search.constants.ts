// ============================================================================
// FUZZY SEARCH CONFIGURATION
// ============================================================================

/**
 * Trigram similarity threshold (0.0 - 1.0).
 * Lower = more tolerant of typos, higher = stricter.
 * 0.3 is a good balance for typo tolerance.
 */
export const FUZZY_SIMILARITY_THRESHOLD = 0.3;

/**
 * Minimum length to activate fuzzy search.
 * Trigrams need at least 3 characters to be effective.
 * Below this, exact search is used instead.
 */
export const FUZZY_MIN_LENGTH = 3;

/**
 * Maximum search term length.
 * pg_trgm must compute trigrams for each character.
 * Protects against DoS attacks with very long terms.
 */
export const MAX_SEARCH_LENGTH = 100;

/**
 * Result limit for fuzzy search.
 * Matches GET_PRODUCTS_MAX_RESULTS_PER_PAGE.
 */
export const FUZZY_MAX_RESULTS = 200;

/**
 * Maximum number of words in a multi-word search term.
 * Limits the complexity of the generated SQL query.
 */
export const FUZZY_MAX_WORDS = 5;

/**
 * Timeout for fuzzy search queries (ms).
 * Prevents long-running queries on large catalogs.
 */
export const FUZZY_TIMEOUT_MS = 2000;

/**
 * Timeout for spell suggestions (ms).
 * Less critical than the main search.
 */
export const SPELL_SUGGESTION_TIMEOUT_MS = 1500;

/**
 * Relevance weights by match type.
 * Used to sort results by relevance.
 */
export const RELEVANCE_WEIGHTS = {
	/** Exact match (substring) in title — maximum priority */
	exactTitle: 10,
	/** Fuzzy match (trigram) in title */
	fuzzyTitle: 5,
	/** Exact match (substring) in description */
	exactDescription: 3,
	/** Fuzzy match (trigram) in description */
	fuzzyDescription: 2,
} as const;

// ============================================================================
// RATE LIMITING
// ============================================================================

/**
 * Search request rate limits.
 * Protects against scraping and abuse.
 */
export const SEARCH_RATE_LIMITS = {
	/** Limit for authenticated users */
	authenticated: { limit: 30, windowMs: 60_000 },
	/** Limit for unauthenticated visitors */
	guest: { limit: 15, windowMs: 60_000 },
} as const;
