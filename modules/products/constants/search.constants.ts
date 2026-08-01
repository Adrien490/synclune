import { TEXT_LIMITS } from "@/shared/constants/validation-limits";
import type { RateLimitConfig } from "@/shared/types/rate-limit.types";

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
 *
 * Dérivée de la SSOT transverse `TEXT_LIMITS.SEARCH` (audit recherche
 * 2026-08-01, P3-1) : schémas Zod des modules, parser URL, `maxLength` DOM et
 * cette borne fuzzy sont désormais la même valeur.
 */
export const MAX_SEARCH_LENGTH = TEXT_LIMITS.SEARCH.max;

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
 *
 * Calibrage (audit recherche 2026-08-01, P3-5) : chaque rendu de la PLP avec
 * `?search=` consomme une unité (recherche, pagination, changement de filtre).
 * À 15/min, un invité épuisait son budget en une navigation normale dans des
 * résultats de recherche, alors que le quick search — bien plus bavard
 * (1 requête par pause de frappe de 300 ms) — dispose de 50/min
 * (`PRODUCT_SEARCH_LIMIT`). Le dépassement reste non bloquant (repli
 * exact-only), mais dégrade la pertinence sans raison.
 */
export const SEARCH_RATE_LIMITS = {
	/** Limit for authenticated users */
	authenticated: {
		name: "product-fuzzy-search-authenticated",
		limit: 30,
		windowMs: 60_000,
	},
	/** Limit for unauthenticated visitors */
	guest: {
		name: "product-fuzzy-search-guest",
		limit: 25,
		windowMs: 60_000,
	},
} as const satisfies Record<string, RateLimitConfig>;
