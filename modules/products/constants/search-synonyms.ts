/**
 * In-memory synonym map for jewelry domain query expansion.
 * Bidirectional: if "bague" maps to ["anneau", "alliance"], then "anneau" maps back to ["bague", "alliance"].
 *
 * Used by fuzzy search to expand search terms before querying.
 * For a small jewelry catalog, a static map is sufficient.
 */

// Synonym groups: each array contains words that should match each other.
// Only single words — multi-word entries (e.g. "boucle d'oreille") are unreachable
// because splitSearchTerms splits on whitespace before synonym lookup.
const SYNONYM_GROUPS: string[][] = [
	// Rings
	["bague", "anneau", "alliance", "chevaliere"],
	// Necklaces
	["collier", "pendentif", "sautoir", "chaine"],
	// Earrings
	["boucle", "boucles", "clou", "creole", "creoles", "dormeuse", "dormeuses"],
	// Bracelets
	["bracelet", "jonc", "manchette", "gourmette"],
	// Materials
	["or", "dore", "gold"],
	["argent", "silver", "argente"],
	["perle", "perles", "nacre"],
	["cristal", "cristaux", "strass"],
	["diamant", "zircon", "zircone", "pierre"],
	// Styles
	["boheme", "boho"],
	["minimaliste", "epure", "simple"],
	// Occasions
	["mariage", "noces", "nuptial"],
	["cadeau", "coffret"],
]

// Build a bidirectional lookup map from synonym groups
function buildSynonymMap(groups: string[][]): Map<string, string[]> {
	const map = new Map<string, string[]>()

	for (const group of groups) {
		for (const term of group) {
			const normalized = term.toLowerCase()
			const synonyms = group
				.filter((s) => s.toLowerCase() !== normalized)
				.map((s) => s.toLowerCase())
			const existing = map.get(normalized)
			if (existing) {
				// Merge without duplicates
				const merged = [...new Set([...existing, ...synonyms])]
				map.set(normalized, merged)
			} else {
				map.set(normalized, synonyms)
			}
		}
	}

	return map
}

export const SEARCH_SYNONYMS = buildSynonymMap(SYNONYM_GROUPS)
