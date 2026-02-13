import { FUZZY_MAX_WORDS, MAX_SEARCH_LENGTH } from "../constants/search.constants";

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
