import { Prisma } from "@/app/generated/prisma/client";

// ============================================================================
// SELECT DEFINITIONS
// ============================================================================

export const GET_PRODUCT_SKU_SELECT = {
	id: true,
	sku: true,
	productId: true,
	priceInclTax: true,
	inventory: true,
	isActive: true,
	isDefault: true,
	color: {
		select: {
			id: true,
			name: true,
			hex: true,
			slug: true,
		},
	},
	materialId: true,
	material: {
		select: {
			id: true,
			name: true,
		},
	},
	size: true,
	createdAt: true,
	updatedAt: true,
	product: {
		select: {
			id: true,
			slug: true,
			title: true,
			status: true,
		},
	},
} as const satisfies Prisma.ProductSkuSelect;

// ============================================================================
// SELECT DEFINITIONS - LISTS
// ============================================================================

/**
 * SELECT léger pour les listes - sans images
 * Utilisé pour les endpoints qui n'ont pas besoin des médias (performance)
 */
export const GET_PRODUCT_SKUS_LIGHT_SELECT = {
	id: true,
	sku: true,
	productId: true,
	priceInclTax: true,
	compareAtPrice: true,
	inventory: true,
	isActive: true,
	isDefault: true,
	size: true,
	createdAt: true,
	updatedAt: true,
	product: {
		select: {
			id: true,
			slug: true,
			title: true,
			status: true,
		},
	},
	color: {
		select: {
			id: true,
			name: true,
			hex: true,
			slug: true,
		},
	},
	material: {
		select: {
			id: true,
			name: true,
		},
	},
} as const satisfies Prisma.ProductSkuSelect;

/**
 * SELECT complet avec images - pour les détails et édition
 */
export const GET_PRODUCT_SKUS_DEFAULT_SELECT = {
	// Champs de base
	id: true,
	sku: true,
	productId: true,
	priceInclTax: true,
	compareAtPrice: true,
	inventory: true,
	isActive: true,
	isDefault: true,
	size: true,
	createdAt: true,
	updatedAt: true,

	// Relations essentielles
	product: {
		select: {
			id: true,
			slug: true,
			title: true,
			description: true,
			status: true,
		},
	},
	color: {
		select: {
			id: true,
			name: true,
			hex: true,
			slug: true,
		},
	},
	material: {
		select: {
			id: true,
			name: true,
			slug: true,
		},
	},

	// Images
	images: {
		select: {
			id: true,
			url: true,
			blurDataUrl: true,
			altText: true,
			isPrimary: true,
			mediaType: true,
		},
		orderBy: { position: "asc" as const },
	},

	// Comptage des relations
	_count: {
		select: {
			images: true,
			orderItems: true,
		},
	},
} as const satisfies Prisma.ProductSkuSelect;

// ============================================================================
// PAGINATION & SORTING
// ============================================================================

export const GET_PRODUCT_SKUS_DEFAULT_PER_PAGE = 20;
export const GET_PRODUCT_SKUS_MAX_RESULTS_PER_PAGE = 200;

export const GET_PRODUCT_SKUS_DEFAULT_PAGINATION = {
	page: 1,
	take: 20,
	perPage: 20,
} as const;

export const GET_PRODUCT_SKUS_DEFAULT_SORT_BY = "created-descending";
export const GET_PRODUCT_SKUS_DEFAULT_SORT_ORDER = "desc";
export const GET_PRODUCT_SKUS_ADMIN_FALLBACK_SORT_BY = "created-descending";

export const GET_PRODUCT_SKUS_SORT_FIELDS = [
	"created-descending",
	"created-ascending",
	"price-ascending",
	"price-descending",
	"stock-ascending",
	"stock-descending",
	"sku-ascending",
	"sku-descending",
] as const;

export const SORT_LABELS: Record<string, string> = {
	"created-descending": "Date de création (plus récent)",
	"created-ascending": "Date de création (plus ancien)",
	"price-ascending": "Prix (croissant)",
	"price-descending": "Prix (décroissant)",
	"stock-ascending": "Stock (croissant)",
	"stock-descending": "Stock (décroissant)",
	"sku-ascending": "Référence (A-Z)",
	"sku-descending": "Référence (Z-A)",
};

// ============================================================================
// FILTERS
// ============================================================================

export const SKU_FILTERS_MIN_DATE = new Date("2020-01-01");
export const SKU_FILTERS_MAX_INVENTORY = 100000;
export const SKU_FILTERS_MAX_PRICE_CENTS = 99999999; // 999999.99€ en centimes

// ============================================================================
// CACHE SETTINGS
// ============================================================================

export const SKU_CACHE_REVALIDATE = 60 * 2; // 2 minutes (données de stock)
export const SKU_CACHE_STALE = 60 * 5; // 5 minutes
export const SKU_CACHE_EXPIRE = 60 * 15; // 15 minutes

export const GET_PRODUCT_SKUS_DEFAULT_CACHE = {
	revalidate: SKU_CACHE_REVALIDATE,
	stale: SKU_CACHE_STALE,
	expire: SKU_CACHE_EXPIRE,
} as const;
