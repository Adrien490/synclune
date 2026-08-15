import type { Prisma } from "@/app/generated/prisma/browser";

// ============================================================================
// SELECT DEFINITIONS — schéma lean (lot 2) : Material { id, name, position },
// relation directe `variants` (FK simple, plus de M2M variantMaterials).
// ============================================================================

export const GET_MATERIALS_SELECT = {
	id: true,
	name: true,
	position: true,
	_count: {
		select: {
			variants: true,
		},
	},
} as const satisfies Prisma.MaterialSelect;

export const GET_MATERIAL_SELECT = {
	id: true,
	name: true,
	position: true,
} as const satisfies Prisma.MaterialSelect;

// ============================================================================
// PAGINATION CONSTANTS
// ============================================================================

export const GET_MATERIALS_DEFAULT_PER_PAGE = 20;
export const GET_MATERIALS_MAX_RESULTS_PER_PAGE = 200;

// ============================================================================
// SORT CONSTANTS
// ============================================================================

export const GET_MATERIALS_DEFAULT_SORT_BY = "name-ascending";

export const GET_MATERIALS_SORT_FIELDS = [
	"name-ascending",
	"name-descending",
	"variantCount-ascending",
	"variantCount-descending",
] as const;

const MATERIALS_SORT_OPTIONS = {
	NAME_ASC: "name-ascending",
	NAME_DESC: "name-descending",
	VARIANT_COUNT_ASC: "variantCount-ascending",
	VARIANT_COUNT_DESC: "variantCount-descending",
} as const;

export const MATERIALS_SORT_LABELS = {
	[MATERIALS_SORT_OPTIONS.NAME_ASC]: "Nom (A-Z)",
	[MATERIALS_SORT_OPTIONS.NAME_DESC]: "Nom (Z-A)",
	[MATERIALS_SORT_OPTIONS.VARIANT_COUNT_ASC]: "Moins de variantes",
	[MATERIALS_SORT_OPTIONS.VARIANT_COUNT_DESC]: "Plus de variantes",
} as const;
