import { FUZZY_MAX_WORDS, MAX_SEARCH_LENGTH } from "../constants/search.constants";

/**
 * Escape LIKE pattern special characters (%, _, \) in a search term.
 * Prevents user input from being interpreted as LIKE wildcards.
 */
export function escapeLikePattern(word: string): string {
	return word.replace(/[%_\\]/g, "\\$&");
}

/**
 * Sanitize a search term for safe logging.
 * Strips control characters and truncates to prevent log injection.
 */
export function sanitizeForLog(term: string, maxLength = 80): string {
	return term.replace(/[\x00-\x1f\x7f]/g, "").slice(0, maxLength);
}

/**
 * Split a search term into individual words for AND-logic matching.
 * Deduplicates (case-insensitive) and caps at FUZZY_MAX_WORDS.
 */
export function splitSearchTerms(searchTerm: string): string[] {
	const trimmed = searchTerm.trim();
	if (!trimmed || trimmed.length > MAX_SEARCH_LENGTH) return [];

	return trimmed
		.split(/\s+/)
		.filter(Boolean)
		.filter(
			(word, i, arr) =>
				arr.findIndex((w) => w.toLowerCase() === word.toLowerCase()) === i
		)
		.slice(0, FUZZY_MAX_WORDS);
}
