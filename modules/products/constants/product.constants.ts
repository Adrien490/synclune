import { Prisma } from "@/app/generated/prisma/client";

// ============================================================================
// SELECT DEFINITIONS
// ============================================================================

/**
 * Select pour les listings produits (grids, carousels)
 * Optimisé pour:
 * - Affichage des swatches couleur interactifs
 * - Changement d'image dynamique sur sélection couleur
 * - Support du dialog de sélection SKU
 *
 * Inclut tous les SKUs actifs pour:
 * - Calcul des couleurs disponibles
 * - Récupération des images par variante
 * - Vérification du stock
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
	reviewStats: {
		select: {
			averageRating: true,
			totalCount: true,
		},
	},
	skus: {
		where: { isActive: true },
		select: {
			id: true,
			priceInclTax: true,
			compareAtPrice: true,
			inventory: true,
			isActive: true,
			isDefault: true,
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
			images: {
				where: { isPrimary: true },
				take: 1,
				select: {
					url: true,
					blurDataUrl: true,
					altText: true,
					mediaType: true,
					isPrimary: true,
				},
			},
		},
		orderBy: [
			{ isDefault: "desc" as const },
			{ priceInclTax: "asc" as const },
		],
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
	reviewStats: {
		select: {
			averageRating: true,
			totalCount: true,
		},
	},
	skus: {
		where: {
			isActive: true,
		},
		select: {
			id: true,
			sku: true,
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
					slug: true,
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
	"popular",
	"rating-descending",
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
// DIALOG IDS
// ============================================================================

/** ID du dialog pour le filter sheet produits (Zustand) */
export const PRODUCT_FILTER_DIALOG_ID = "product-filter-sheet";

// ============================================================================
// UI OPTIONS
// ============================================================================

export const PRODUCTS_SORT_OPTIONS = {
	BEST_SELLING: "best-selling",
	POPULAR: "popular",
	RATING_DESC: "rating-descending",
	TITLE_ASC: "title-ascending",
	TITLE_DESC: "title-descending",
	PRICE_ASC: "price-ascending",
	PRICE_DESC: "price-descending",
	CREATED_ASC: "created-ascending",
	CREATED_DESC: "created-descending",
} as const;

export const PRODUCTS_SORT_LABELS = {
	[PRODUCTS_SORT_OPTIONS.BEST_SELLING]: "Meilleures ventes",
	[PRODUCTS_SORT_OPTIONS.POPULAR]: "Populaires",
	[PRODUCTS_SORT_OPTIONS.RATING_DESC]: "Mieux notés",
	[PRODUCTS_SORT_OPTIONS.TITLE_ASC]: "Alphabétique (A-Z)",
	[PRODUCTS_SORT_OPTIONS.TITLE_DESC]: "Alphabétique (Z-A)",
	[PRODUCTS_SORT_OPTIONS.PRICE_ASC]: "Prix croissant",
	[PRODUCTS_SORT_OPTIONS.PRICE_DESC]: "Prix décroissant",
	[PRODUCTS_SORT_OPTIONS.CREATED_ASC]: "Plus anciens",
	[PRODUCTS_SORT_OPTIONS.CREATED_DESC]: "Plus récents",
} as const;

// Aliases pour compatibilité
export const SORT_OPTIONS = PRODUCTS_SORT_OPTIONS;
export const SORT_LABELS = PRODUCTS_SORT_LABELS;

// ============================================================================
// ADMIN SORT LABELS
// ============================================================================

/**
 * Labels de tri pour l'admin (inclut des options supplémentaires)
 */
export const ADMIN_PRODUCTS_SORT_LABELS: Record<string, string> = {
	...PRODUCTS_SORT_LABELS,
	createdAt: "Date de création",
	updatedAt: "Date de mise à jour",
	title: "Titre",
	type: "Type",
};
