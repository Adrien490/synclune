import type {
	CursorPaginationParams,
	CursorPaginationResult,
	PaginationInfo,
} from "@/shared/types/pagination.types"

export type { CursorPaginationParams, PaginationInfo, CursorPaginationResult } from "@/shared/types/pagination.types"

/**
 * Default number of items per page
 */
export const DEFAULT_PER_PAGE = 20

/**
 * Available options for items per page
 */
export const PER_PAGE_OPTIONS = [20, 50, 100, 200] as const

/**
 * Default direction for cursor pagination
 */
export const DEFAULT_DIRECTION = "forward" as const

/**
 * Helper to build cursor-based pagination for Prisma queries
 * More performant than offset-based pagination for large datasets
 *
 * Prisma cursor pagination works by:
 * - Positive take: fetch items AFTER cursor
 * - Negative take: fetch items BEFORE cursor
 * - skip: 1 excludes the cursor item itself
 */
export function buildCursorPagination(params: CursorPaginationParams): {
	take: number;
	skip?: number;
	cursor?: { id: string };
} {
	const { cursor, direction, take } = params;

	// Première page : pas de cursor
	if (!cursor) {
		// +1 pour détecter s'il y a une page suivante
		return { take: take + 1 };
	}

	// Avec cursor : toujours skip: 1 pour exclure l'élément du cursor
	if (direction === "backward") {
		// Take négatif = fetch AVANT le cursor
		return {
			take: -(take + 1),
			skip: 1,
			cursor: { id: cursor },
		};
	}

	// Direction forward (ou par défaut)
	// Take positif = fetch APRÈS le cursor
	return {
		take: take + 1,
		skip: 1,
		cursor: { id: cursor },
	};
}

/**
 * Process cursor pagination results (Prisma 2025 Best Practices)
 *
 * Selon la documentation Prisma :
 * - Forward (take > 0) : fetch items APRÈS cursor, retourne dans l'ordre normal
 * - Backward (take < 0) : fetch items AVANT cursor, retourne dans l'ordre INVERSE
 *
 * On demande toujours take+1 pour détecter s'il y a plus de pages.
 *
 * Cursors selon spec Relay :
 * - nextCursor : ID du dernier élément de la page (pour aller forward)
 * - prevCursor : ID du premier élément de la page (pour aller backward)
 */
export function processCursorResults<T extends { id: string }>(
	items: T[],
	requestedTake: number,
	direction: "forward" | "backward" = "forward",
	currentCursor?: string
): CursorPaginationResult<T> {
	// Pas de résultats
	if (items.length === 0) {
		return {
			items: [],
			pagination: {
				nextCursor: null,
				prevCursor: null,
				hasNextPage: false,
				hasPreviousPage: false,
			},
		};
	}

	// On a demandé take+1 pour détecter s'il y a plus de résultats
	const hasMore = items.length > requestedTake;

	if (direction === "backward") {
		// IMPORTANT: Prisma avec take négatif retourne dans le MÊME ordre que orderBy
		// Ex: cursor=21, take=-11 → fetch items AVANT 21 → [10,11,12...19,20]
		// L'élément +1 est AU DÉBUT (le plus ancien = 10)
		const actualItems = hasMore ? items.slice(1) : items;

		return {
			items: actualItems,
			pagination: {
				// nextCursor : dernier élément de cette page (pour aller forward)
				// Permet de retourner à la page suivante en fetchant APRÈS ce cursor
				nextCursor:
					actualItems.length > 0
						? actualItems[actualItems.length - 1].id
						: null,
				// prevCursor : premier élément (pour continuer backward) SI il y a plus avant
				prevCursor: hasMore ? actualItems[0].id : null,
				// hasNextPage : on peut aller forward SI on a utilisé un cursor
				hasNextPage: !!currentCursor,
				// hasPreviousPage : il y a plus d'éléments avant SI hasMore
				hasPreviousPage: hasMore,
			},
		};
	}

	// Mode FORWARD (défaut)
	// Prisma retourne les items dans l'ordre normal
	// Enlever l'élément +1 si présent (le plus récent)
	const actualItems = hasMore ? items.slice(0, -1) : items;

	return {
		items: actualItems,
		pagination: {
			// nextCursor : dernier élément (pour continuer forward) SI il y a plus après
			nextCursor: hasMore ? actualItems[actualItems.length - 1].id : null,
			// prevCursor : premier élément (pour aller backward) SI on n'est pas à la page 1
			prevCursor: currentCursor ? actualItems[0].id : null,
			// hasNextPage : il y a plus d'éléments après SI hasMore
			hasNextPage: hasMore,
			// hasPreviousPage : on peut aller backward SI on a un cursor (pas page 1)
			hasPreviousPage: !!currentCursor,
		},
	};
}

