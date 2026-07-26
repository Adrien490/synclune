import type { Prisma } from "@/app/generated/prisma/browser";

// ============================================================================
// SELECT DEFINITIONS
// ============================================================================

// Affichage et tri alignés : on compte TOUS les liens skuColors (y compris SKUs
// soft-deleted) pour que la colonne « Variantes » affiche la même valeur que
// celle utilisée par orderBy { skuColors: { _count } }. Prisma ne supporte pas
// orderBy avec un where partial sur le _count ; aligner le select sur le sort
// évite l'incohérence (parité matériaux audit 2026-05-11 P1.3).
//
// Note 2026-05-15 : depuis la migration M2M couleurs, la relation s'appelle
// `skuColors` (et non plus `skus`). Le shape est conservé via mapping côté API
// pour ne pas casser l'UI (`_count.skus` reste exposé).
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
			skuColors: true,
		},
	},
} as const satisfies Prisma.ColorSelect;

export const GET_COLOR_SELECT = {
	id: true,
	slug: true,
	name: true,
	hex: true,
	description: true,
	isActive: true,
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
