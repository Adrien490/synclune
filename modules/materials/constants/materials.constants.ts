import type { Prisma } from "@/app/generated/prisma/browser";

// ============================================================================
// SELECT DEFINITIONS
// ============================================================================

// Affichage et tri alignés : on compte TOUS les liens skuMaterials (y compris
// SKUs soft-deleted) pour que la colonne « Variantes » affiche la même valeur
// que celle utilisée par orderBy { skuMaterials: { _count } }. Prisma ne
// supporte pas orderBy avec un where partial sur le _count ; aligner le select
// sur le sort évite l'incohérence (audit 2026-05-11 P1.3).
//
// Note 2026-05-14 : depuis la migration M2M matériaux, la relation s'appelle
// `skuMaterials` (et non plus `skus`). Le shape est conservé via mapping côté
// API pour ne pas casser l'UI (`_count.skus` reste exposé).
export const GET_MATERIALS_SELECT = {
	id: true,
	name: true,
	slug: true,
	description: true,
	isActive: true,
	createdAt: true,
	updatedAt: true,
	_count: {
		select: {
			skuMaterials: true,
		},
	},
} as const satisfies Prisma.MaterialSelect;

export const GET_MATERIAL_SELECT = {
	id: true,
	slug: true,
	name: true,
	description: true,
	isActive: true,
	createdAt: true,
	updatedAt: true,
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
	"skuCount-ascending",
	"skuCount-descending",
	"createdAt-ascending",
	"createdAt-descending",
] as const;

const MATERIALS_SORT_OPTIONS = {
	NAME_ASC: "name-ascending",
	NAME_DESC: "name-descending",
	SKU_COUNT_ASC: "skuCount-ascending",
	SKU_COUNT_DESC: "skuCount-descending",
	CREATED_ASC: "createdAt-ascending",
	CREATED_DESC: "createdAt-descending",
} as const;

export const MATERIALS_SORT_LABELS = {
	[MATERIALS_SORT_OPTIONS.NAME_ASC]: "Nom (A-Z)",
	[MATERIALS_SORT_OPTIONS.NAME_DESC]: "Nom (Z-A)",
	[MATERIALS_SORT_OPTIONS.SKU_COUNT_ASC]: "Moins de variantes",
	[MATERIALS_SORT_OPTIONS.SKU_COUNT_DESC]: "Plus de variantes",
	[MATERIALS_SORT_OPTIONS.CREATED_ASC]: "Plus anciens",
	[MATERIALS_SORT_OPTIONS.CREATED_DESC]: "Plus récents",
} as const;
