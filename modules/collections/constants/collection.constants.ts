import type { Prisma } from "@/app/generated/prisma/browser";
import { ProductStatus } from "@/app/generated/prisma/enums";

import { BULK_SELECTION_MAX } from "@/shared/constants/admin-bulk";

// ============================================================================
// SELECT DEFINITIONS
// ============================================================================

/**
 * Cap a la lecture des associations pour le detail admin. Au-dela, l'admin
 * doit utiliser la gestion catalogue dediee. Voir GET_COLLECTION_PRODUCTS_LIMIT
 * + UX hint dans collection-products-list.
 */
export const GET_COLLECTION_PRODUCTS_LIMIT = 100;

export const GET_COLLECTION_SELECT = {
	id: true,
	slug: true,
	name: true,
	description: true,
	status: true,
	createdAt: true,
	updatedAt: true,
	products: {
		where: {
			product: {
				status: ProductStatus.PUBLIC,
			},
		},
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
									blurDataUrl: true,
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
		orderBy: [{ isFeatured: "desc" }, { addedAt: "desc" }],
		take: GET_COLLECTION_PRODUCTS_LIMIT,
	},
	_count: {
		select: {
			products: {
				where: {
					product: {
						status: ProductStatus.PUBLIC,
					},
				},
			},
		},
	},
} as const satisfies Prisma.CollectionSelect;

/**
 * Lightweight select for storefront collection pages (SEO metadata + OG image + JSON-LD).
 * Only loads what's needed: name, description, status, and minimal product data
 * for featured image extraction, product type keywords, public product count,
 * and ItemList Product+Offer JSON-LD (mainEntity).
 */
export const GET_COLLECTION_STOREFRONT_SELECT = {
	slug: true,
	name: true,
	description: true,
	status: true,
	products: {
		where: {
			product: {
				status: ProductStatus.PUBLIC,
			},
		},
		select: {
			isFeatured: true,
			product: {
				select: {
					slug: true,
					title: true,
					status: true,
					type: {
						select: {
							label: true,
						},
					},
					skus: {
						where: { isActive: true },
						select: {
							isDefault: true,
							priceInclTax: true,
							inventory: true,
							images: {
								select: {
									url: true,
									altText: true,
									isPrimary: true,
								},
								orderBy: { createdAt: "asc" },
								take: 1,
							},
						},
						orderBy: [{ isDefault: "desc" }],
						take: 1,
					},
				},
			},
		},
		orderBy: [{ isFeatured: "desc" }, { addedAt: "desc" }],
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
	// Featured product image for collection card (with fallback to most recent)
	// orderBy: isFeatured desc puts featured product first, otherwise most recent
	products: {
		where: {
			product: {
				status: ProductStatus.PUBLIC,
			},
		},
		select: {
			isFeatured: true,
			product: {
				select: {
					id: true,
					title: true,
					skus: {
						where: { isActive: true },
						select: {
							priceInclTax: true,
							images: {
								select: { url: true, altText: true, blurDataUrl: true },
								orderBy: { position: "asc" },
								take: 1,
							},
						},
						orderBy: [{ isDefault: "desc" }, { priceInclTax: "asc" }],
						take: 1,
					},
				},
			},
		},
		orderBy: [{ isFeatured: "desc" }, { addedAt: "desc" }],
		take: 4, // 4 products for the Bento Grid
	},
	_count: {
		select: {
			products: {
				where: {
					product: {
						status: ProductStatus.PUBLIC,
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

/**
 * Cap des ids retournés par get-filtered-collection-ids pour le banner
 * "Sélectionner les N filtrés" (parité produits, cf. BULK_PRODUCT_ACTION_LIMIT).
 */
export const BULK_COLLECTION_ACTION_LIMIT = BULK_SELECTION_MAX;

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

const COLLECTIONS_SORT_OPTIONS = {
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

export { COLLECTION_STATUS_LABELS } from "./collection-status.constants";
