/** Match query against word starts in text (e.g. "or" matches "Oreilles" but not "Colorees") */
export function matchesWordStart(text: string, query: string): boolean {
	const lowerText = text.toLowerCase()
	// Full-text match: text starts with query OR query starts with text
	if (lowerText.startsWith(query) || query.startsWith(lowerText)) return true
	// Word-start match: any word in the text starts with the query
	const words = lowerText.split(/\s+/)
	return words.some((word) => word.startsWith(query))
}
