/** Strip diacritics for accent-insensitive matching (client-side equivalent of immutable_unaccent) */
function stripAccents(str: string): string {
	return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
}

/** Match query against word starts in text (e.g. "or" matches "Oreilles" but not "Colorees") */
export function matchesWordStart(text: string, query: string): boolean {
	const normalizedText = stripAccents(text.toLowerCase())
	const normalizedQuery = stripAccents(query.toLowerCase())
	// Full-text match: text starts with query OR query starts with text
	if (normalizedText.startsWith(normalizedQuery) || normalizedQuery.startsWith(normalizedText)) return true
	// Word-start match: any word in the text starts with the query
	const words = normalizedText.split(/\s+/)
	return words.some((word) => word.startsWith(normalizedQuery))
}
