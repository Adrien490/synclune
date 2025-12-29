/**
 * Types pour la pagination (offset et cursor)
 */

// =============================================================================
// CURSOR PAGINATION TYPES
// =============================================================================

export interface CursorPaginationParams {
	cursor?: string
	direction?: "forward" | "backward"
	take: number
}

export interface PaginationInfo {
	nextCursor: string | null
	prevCursor: string | null
	hasNextPage: boolean
	hasPreviousPage: boolean
}

export interface CursorPaginationResult<T> {
	items: T[]
	pagination: PaginationInfo
}

// =============================================================================
// FILTER TYPES
// =============================================================================

export type FilterOption = {
	value: string
	label: string
}
