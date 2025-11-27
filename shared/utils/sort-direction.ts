// ============================================================================
// SORT DIRECTION UTILS
// ============================================================================

/**
 * Extrait la direction de tri depuis une chaîne de tri
 * @param sortBy - Chaîne de tri (ex: "created-ascending", "total-descending")
 * @returns Direction de tri ("asc" | "desc")
 */
export function getSortDirection(sortBy: string): "asc" | "desc" {
	if (sortBy.endsWith("-ascending")) return "asc";
	if (sortBy.endsWith("-descending")) return "desc";
	return "desc";
}
