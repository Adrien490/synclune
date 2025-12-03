import { Prisma } from "@/app/generated/prisma";

// ============================================================================
// SELECT DEFINITIONS
// ============================================================================

/**
 * Select minimal pour les listings produits (grids, carousels)
 * Optimisé pour réduire la taille des payloads
 * - 1 SKU par défaut uniquement
 * - 1 image primaire uniquement
 * - Pas de collections
 */
export const PRODUCT_LIST_SELECT = {
	id: true,
	slug: true,
	title: true,
	status: true,
	type: {
		select: {
			id: true,
			slug: true,
			label: true,
		},
	},
	skus: {
		where: { isActive: true, isDefault: true },
		take: 1,
		select: {
			id: true,
			priceInclTax: true,
			compareAtPrice: true,
			inventory: true,
			images: {
				where: { isPrimary: true },
				take: 1,
				select: {
					url: true,
					blurDataUrl: true,
					altText: true,
					mediaType: true,
				},
			},
		},
	},
} as const satisfies Prisma.ProductSelect;

/**
 * Select complet pour la page détail d'un produit
 */
export const GET_PRODUCT_SELECT = {
	id: true,
	slug: true,
	title: true,
	description: true,
	type: {
		select: {
			id: true,
			slug: true,
			label: true,
			isActive: true,
		},
	},
	status: true,
	createdAt: true,
	updatedAt: true,
	skus: {
		where: {
			isActive: true,
		},
		select: {
			id: true,
			sku: true,
			color: {
				select: {
					id: true,
					slug: true,
					name: true,
					hex: true,
				},
			},
			material: {
				select: {
					id: true,
					name: true,
				},
			},
			size: true,
			priceInclTax: true,
			compareAtPrice: true,
			inventory: true,
			isActive: true,
			isDefault: true,
			images: {
				select: {
					id: true,
					url: true,
					thumbnailUrl: true,
					thumbnailSmallUrl: true,
					blurDataUrl: true,
					altText: true,
					mediaType: true,
					isPrimary: true,
				},
				orderBy: {
					isPrimary: "desc" as const,
				},
			},
		},
		orderBy: [
			{ isDefault: "desc" as const },
			{ priceInclTax: "asc" as const },
		],
	},
	collections: {
		select: {
			id: true,
			addedAt: true,
			isFeatured: true,
			collection: {
				select: {
					id: true,
					name: true,
					slug: true,
					description: true,
					status: true,
				},
			},
		},
		orderBy: {
			addedAt: "desc" as const,
		},
	},
} as const satisfies Prisma.ProductSelect;

export const GET_PRODUCTS_SELECT = {
	id: true,
	slug: true,
	title: true,
	description: true,
	type: {
		select: {
			id: true,
			slug: true,
			label: true,
			isActive: true,
		},
	},
	status: true,
	createdAt: true,
	updatedAt: true,
	skus: {
		where: {
			isActive: true,
		},
		select: {
			id: true,
			sku: true,
			priceInclTax: true,
			inventory: true,
			isActive: true,
			isDefault: true,
			images: {
				select: {
					id: true,
					url: true,
					thumbnailUrl: true,
					thumbnailSmallUrl: true,
					blurDataUrl: true,
					altText: true,
					mediaType: true,
					isPrimary: true,
				},
				orderBy: {
					createdAt: "asc",
				},
			},
			material: {
				select: {
					id: true,
					name: true,
				},
			},
			color: {
				select: {
					id: true,
					name: true,
					hex: true,
				},
			},
			size: true,
		},
		orderBy: [{ isDefault: "desc" as const }, { priceInclTax: "asc" as const }],
	},
	_count: {
		select: {
			skus: {
				where: {
					isActive: true,
				},
			},
		},
	},
	collections: {
		select: {
			id: true,
			addedAt: true,
			isFeatured: true,
			collection: {
				select: {
					id: true,
					name: true,
					slug: true,
					description: true,
					status: true,
				},
			},
		},
		orderBy: {
			addedAt: "desc" as const,
		},
	},
} as const satisfies Prisma.ProductSelect;

// ============================================================================
// PAGINATION & SORTING
// ============================================================================

export const GET_PRODUCTS_DEFAULT_PER_PAGE = 20;
export const GET_PRODUCTS_MAX_RESULTS_PER_PAGE = 200;
export const GET_PRODUCTS_DEFAULT_SORT_BY = "created-descending";
export const GET_PRODUCTS_ADMIN_FALLBACK_SORT_BY = "created-descending";

export const GET_PRODUCTS_SORT_FIELDS = [
	"best-selling",
	"title-ascending",
	"title-descending",
	"price-ascending",
	"price-descending",
	"created-ascending",
	"created-descending",
	"createdAt",
	"updatedAt",
	"title",
	"type",
] as const;

// ============================================================================
// UI OPTIONS
// ============================================================================

export const PRODUCTS_SORT_OPTIONS = {
	TITLE_ASC: "title-ascending",
	TITLE_DESC: "title-descending",
	PRICE_ASC: "price-ascending",
	PRICE_DESC: "price-descending",
	CREATED_ASC: "created-ascending",
	CREATED_DESC: "created-descending",
} as const;

export const PRODUCTS_SORT_LABELS = {
	[PRODUCTS_SORT_OPTIONS.TITLE_ASC]: "Alphabétique (A-Z)",
	[PRODUCTS_SORT_OPTIONS.TITLE_DESC]: "Alphabétique (Z-A)",
	[PRODUCTS_SORT_OPTIONS.PRICE_ASC]: "Prix croissant",
	[PRODUCTS_SORT_OPTIONS.PRICE_DESC]: "Prix décroissant",
	[PRODUCTS_SORT_OPTIONS.CREATED_ASC]: "Plus anciens en premier",
	[PRODUCTS_SORT_OPTIONS.CREATED_DESC]: "Plus récents en premier",
} as const;

// Aliases pour compatibilité
export const SORT_OPTIONS = PRODUCTS_SORT_OPTIONS;
export const SORT_LABELS = PRODUCTS_SORT_LABELS;
