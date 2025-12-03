import { Prisma } from "@/app/generated/prisma";

// ============================================================================
// SELECT DEFINITIONS
// ============================================================================

export const GET_COLLECTION_SELECT = {
	id: true,
	slug: true,
	name: true,
	description: true,
	status: true,
	createdAt: true,
	updatedAt: true,
	products: {
		select: {
			id: true,
			addedAt: true,
			isFeatured: true,
			product: {
				select: {
					id: true,
					slug: true,
					title: true,
					description: true,
					status: true,
					createdAt: true,
					updatedAt: true,
					type: {
						select: {
							id: true,
							slug: true,
							label: true,
							isActive: true,
						},
					},
					skus: {
						where: {
							isActive: true,
						},
						select: {
							id: true,
							isDefault: true,
							priceInclTax: true,
							images: {
								select: {
									id: true,
									url: true,
									altText: true,
									mediaType: true,
									isPrimary: true,
								},
								orderBy: { createdAt: "asc" },
							},
						},
						orderBy: [{ isDefault: "desc" }, { priceInclTax: "asc" }],
					},
				},
			},
		},
		orderBy: { addedAt: "desc" },
	},
} as const satisfies Prisma.CollectionSelect;

export const GET_COLLECTIONS_SELECT = {
	id: true,
	slug: true,
	name: true,
	description: true,
	status: true,
	createdAt: true,
	updatedAt: true,
	// Produit vedette pour l'image de la collection
	products: {
		where: { isFeatured: true },
		select: {
			product: {
				select: {
					id: true,
					title: true,
					skus: {
						where: { isActive: true, isDefault: true },
						select: {
							images: {
								where: { isPrimary: true },
								select: { url: true, altText: true },
								take: 1,
							},
						},
						take: 1,
					},
				},
			},
		},
		take: 1,
	},
	_count: {
		select: {
			products: {
				where: {
					product: {
						status: "PUBLIC",
					},
				},
			},
		},
	},
} as const satisfies Prisma.CollectionSelect;

// ============================================================================
// PAGINATION & SORTING
// ============================================================================

export const GET_COLLECTIONS_DEFAULT_PER_PAGE = 20;
export const GET_COLLECTIONS_MAX_RESULTS_PER_PAGE = 200;
export const GET_COLLECTIONS_DEFAULT_SORT_BY = "name-ascending";

export const GET_COLLECTIONS_SORT_FIELDS = [
	"name-ascending",
	"name-descending",
	"created-ascending",
	"created-descending",
	"products-ascending",
	"products-descending",
] as const;

// ============================================================================
// UI OPTIONS
// ============================================================================

export const COLLECTIONS_SORT_OPTIONS = {
	NAME_ASC: "name-ascending",
	NAME_DESC: "name-descending",
	CREATED_ASC: "created-ascending",
	CREATED_DESC: "created-descending",
	PRODUCTS_ASC: "products-ascending",
	PRODUCTS_DESC: "products-descending",
} as const;

export const COLLECTIONS_SORT_LABELS = {
	[COLLECTIONS_SORT_OPTIONS.NAME_ASC]: "Nom (A-Z)",
	[COLLECTIONS_SORT_OPTIONS.NAME_DESC]: "Nom (Z-A)",
	[COLLECTIONS_SORT_OPTIONS.CREATED_ASC]: "Plus anciennes",
	[COLLECTIONS_SORT_OPTIONS.CREATED_DESC]: "Plus récentes",
	[COLLECTIONS_SORT_OPTIONS.PRODUCTS_ASC]: "Moins de produits",
	[COLLECTIONS_SORT_OPTIONS.PRODUCTS_DESC]: "Plus de produits",
} as const;

// ============================================================================
// STATUS LABELS & COLORS
// Note: Client-safe constants are in collection-status.constants.ts
// Re-export for backward compatibility with server components
// ============================================================================

export {
	COLLECTION_STATUS_LABELS,
	COLLECTION_STATUS_COLORS,
} from "./collection-status.constants";
