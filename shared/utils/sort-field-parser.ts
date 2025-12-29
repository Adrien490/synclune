/**
 * Utilitaires pour le parsing des champs de tri
 *
 * Pattern commun pour parser des strings de tri au format "field-direction"
 * Ex: "createdAt-desc", "price-asc", "rating-desc"
 */

import type { ParsedSortField } from "@/shared/types/utility.types"

export type { ParsedSortField } from "@/shared/types/utility.types"

/**
 * Vérifie si l'input sortBy est valide
 */
export function hasSortByInput(input: unknown): input is string {
	return typeof input === "string" && input.trim().length > 0
}

/**
 * Parse le champ de tri pour extraire le champ et la direction
 *
 * @param sortBy - String au format "field-direction"
 * @param defaultField - Champ par défaut si non trouvé (par défaut: "createdAt")
 * @returns Objet avec field et direction
 *
 * @example
 * parseSortField("createdAt-desc") // { field: "createdAt", direction: "desc" }
 * parseSortField("rating-asc") // { field: "rating", direction: "asc" }
 * parseSortField("my-field-name-desc") // { field: "my-field-name", direction: "desc" }
 */
export function parseSortField(
	sortBy: string,
	defaultField: string = "createdAt"
): ParsedSortField {
	const parts = sortBy.split("-")
	const direction = parts.pop() as "asc" | "desc"
	const field = parts.join("-") || defaultField
	return { field, direction }
}
