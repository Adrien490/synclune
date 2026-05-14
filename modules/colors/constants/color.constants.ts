import type { Prisma } from "@/app/generated/prisma/browser";

import { BULK_SELECTION_MAX } from "@/shared/constants/admin-bulk";

// ============================================================================
// SELECT DEFINITIONS
// ============================================================================

export const GET_COLORS_SELECT = {
	id: true,
	name: true,
	slug: true,
	hex: true,
	description: true,
	isActive: true,
	createdAt: true,
	updatedAt: true,
	_count: {
		select: {
			skus: true,
		},
	},
} as const satisfies Prisma.ColorSelect;

export const GET_COLOR_SELECT = {
	id: true,
	slug: true,
	name: true,
	hex: true,
	description: true,
	createdAt: true,
	updatedAt: true,
} as const satisfies Prisma.ColorSelect;

// ============================================================================
// SEARCH CONSTANTS
// ============================================================================

export const COLOR_SEARCH_MAX_LENGTH = 100;

// ============================================================================
// PAGINATION CONSTANTS
// ============================================================================

export const GET_COLORS_DEFAULT_PER_PAGE = 20;
export const GET_COLORS_MAX_RESULTS_PER_PAGE = 200;

/**
 * Cap des ids retournés par get-filtered-color-ids pour le banner
 * "Sélectionner les N filtrés" (parité produits, cf. BULK_PRODUCT_ACTION_LIMIT).
 */
export const BULK_COLOR_ACTION_LIMIT = BULK_SELECTION_MAX;

// ============================================================================
// SORT CONSTANTS
// ============================================================================

export const GET_COLORS_DEFAULT_SORT_BY = "name-ascending";

export const GET_COLORS_SORT_FIELDS = [
	"name-ascending",
	"name-descending",
	"skuCount-ascending",
	"skuCount-descending",
] as const;

const COLORS_SORT_OPTIONS = {
	NAME_ASC: "name-ascending",
	NAME_DESC: "name-descending",
	SKU_COUNT_ASC: "skuCount-ascending",
	SKU_COUNT_DESC: "skuCount-descending",
} as const;

export const COLORS_SORT_LABELS = {
	[COLORS_SORT_OPTIONS.NAME_ASC]: "Nom (A-Z)",
	[COLORS_SORT_OPTIONS.NAME_DESC]: "Nom (Z-A)",
	[COLORS_SORT_OPTIONS.SKU_COUNT_ASC]: "Moins de variantes",
	[COLORS_SORT_OPTIONS.SKU_COUNT_DESC]: "Plus de variantes",
} as const;
