import { Prisma } from "@/app/generated/prisma";

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
	createdAt: true,
	updatedAt: true,
} as const satisfies Prisma.ProductTypeSelect;

// ============================================================================
// PAGINATION CONSTANTS
// ============================================================================

export const GET_PRODUCT_TYPES_DEFAULT_PER_PAGE = 20;
export const GET_PRODUCT_TYPES_MAX_RESULTS_PER_PAGE = 200;

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

export const PRODUCT_TYPES_SORT_OPTIONS = {
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
