import { TEXT_LIMITS } from "@/shared/constants/validation-limits";
import type { Prisma } from "@/app/generated/prisma/browser";

// ============================================================================
// SELECT DEFINITIONS — schéma lean (lot 2) : Color { id, name, hex?, position },
// relation directe `variants` (FK simple, plus de M2M variantColors).
// ============================================================================

export const GET_COLORS_SELECT = {
	id: true,
	name: true,
	hex: true,
	position: true,
	_count: {
		select: {
			variants: true,
		},
	},
} as const satisfies Prisma.ColorSelect;

export const GET_COLOR_SELECT = {
	id: true,
	name: true,
	hex: true,
	position: true,
} as const satisfies Prisma.ColorSelect;

// ============================================================================
// SEARCH CONSTANTS
// ============================================================================

export const COLOR_SEARCH_MAX_LENGTH = TEXT_LIMITS.SEARCH.max;

// ============================================================================
// PAGINATION CONSTANTS
// ============================================================================

export const GET_COLORS_DEFAULT_PER_PAGE = 20;
export const GET_COLORS_MAX_RESULTS_PER_PAGE = 200;

// ============================================================================
// SORT CONSTANTS
// ============================================================================

export const GET_COLORS_DEFAULT_SORT_BY = "name-ascending";

export const GET_COLORS_SORT_FIELDS = [
	"name-ascending",
	"name-descending",
	"variantCount-ascending",
	"variantCount-descending",
] as const;

const COLORS_SORT_OPTIONS = {
	NAME_ASC: "name-ascending",
	NAME_DESC: "name-descending",
	VARIANT_COUNT_ASC: "variantCount-ascending",
	VARIANT_COUNT_DESC: "variantCount-descending",
} as const;

export const COLORS_SORT_LABELS = {
	[COLORS_SORT_OPTIONS.NAME_ASC]: "Nom (A-Z)",
	[COLORS_SORT_OPTIONS.NAME_DESC]: "Nom (Z-A)",
	[COLORS_SORT_OPTIONS.VARIANT_COUNT_ASC]: "Moins de variantes",
	[COLORS_SORT_OPTIONS.VARIANT_COUNT_DESC]: "Plus de variantes",
} as const;
