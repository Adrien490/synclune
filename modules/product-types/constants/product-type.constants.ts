import type { Prisma } from "@/app/generated/prisma/browser";

import { BULK_SELECTION_MAX } from "@/shared/constants/admin-bulk";

// ============================================================================
// SELECT DEFINITIONS
// ============================================================================

export const GET_PRODUCT_TYPES_SELECT = {
	id: true,
	slug: true,
	label: true,
	description: true,
	isActive: true,
	isSystem: true,
	createdAt: true,
	updatedAt: true,
	_count: {
		select: {
			products: {
				where: {
					status: "PUBLIC",
					// Explicite même si status=PUBLIC exclut déjà les soft-deleted
					// aujourd'hui (deleteProduct force ARCHIVED) — ne pas dépendre
					// de ce couplage pour le compte affiché.
					deletedAt: null,
					skus: {
						some: {
							isActive: true,
						},
					},
				},
			},
		},
	},
} as const satisfies Prisma.ProductTypeSelect;

export const GET_PRODUCT_TYPE_SELECT = {
	id: true,
	slug: true,
	label: true,
	description: true,
	isActive: true,
	isSystem: true,
	createdAt: true,
	updatedAt: true,
	// Compte des produits réellement visibles storefront (mêmes critères que
	// GET_PRODUCT_TYPES_SELECT) — sert au noindex des pages catégorie vides.
	_count: {
		select: {
			products: {
				where: {
					status: "PUBLIC",
					deletedAt: null,
					skus: {
						some: {
							isActive: true,
						},
					},
				},
			},
		},
	},
} as const satisfies Prisma.ProductTypeSelect;

// ============================================================================
// PAGINATION CONSTANTS
// ============================================================================

export const GET_PRODUCT_TYPES_DEFAULT_PER_PAGE = 20;
export const GET_PRODUCT_TYPES_MAX_RESULTS_PER_PAGE = 200;

/**
 * Cap des ids retournés par get-filtered-product-type-ids pour le banner
 * "Sélectionner les N filtrés" (parité produits, cf. BULK_PRODUCT_ACTION_LIMIT).
 */
export const BULK_PRODUCT_TYPE_ACTION_LIMIT = BULK_SELECTION_MAX;

// ============================================================================
// SORT CONSTANTS
// ============================================================================

export const GET_PRODUCT_TYPES_DEFAULT_SORT_BY = "label-ascending";

export const GET_PRODUCT_TYPES_SORT_FIELDS = [
	"label-ascending",
	"label-descending",
	"products-ascending",
	"products-descending",
] as const;

const PRODUCT_TYPES_SORT_OPTIONS = {
	LABEL_ASC: "label-ascending",
	LABEL_DESC: "label-descending",
	PRODUCTS_ASC: "products-ascending",
	PRODUCTS_DESC: "products-descending",
} as const;

export const PRODUCT_TYPES_SORT_LABELS = {
	[PRODUCT_TYPES_SORT_OPTIONS.LABEL_ASC]: "Label (A-Z)",
	[PRODUCT_TYPES_SORT_OPTIONS.LABEL_DESC]: "Label (Z-A)",
	[PRODUCT_TYPES_SORT_OPTIONS.PRODUCTS_ASC]: "Moins de produits",
	[PRODUCT_TYPES_SORT_OPTIONS.PRODUCTS_DESC]: "Plus de produits",
} as const;
