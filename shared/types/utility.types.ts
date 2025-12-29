/**
 * Types utilitaires partagés
 */

// =============================================================================
// SORT FIELD TYPES
// =============================================================================

export interface ParsedSortField {
	field: string
	direction: "asc" | "desc"
}

// =============================================================================
// TOUCH GEOMETRY TYPES
// =============================================================================

export interface Point {
	x: number
	y: number
}

// =============================================================================
// PASSWORD TYPES
// =============================================================================

export interface PasswordRule {
	label: string
	test: (password: string) => boolean
}
