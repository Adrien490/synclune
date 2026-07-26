import type { Prisma } from "@/app/generated/prisma/browser";

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
	// Couleurs M2M ordonnées par priorité (1re = principale pour vignette + snapshot)
	colors: {
		select: {
			colorId: true,
			position: true,
			color: {
				select: {
					id: true,
					name: true,
					hex: true,
					slug: true,
				},
			},
		},
		orderBy: { position: "asc" as const },
	},
	// Matériaux M2M ordonnés par priorité (1er = principal pour SEO/care-tips)
	materials: {
		select: {
			materialId: true,
			position: true,
			material: {
				select: {
					id: true,
					name: true,
					slug: true,
				},
			},
		},
		orderBy: { position: "asc" as const },
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
	// Couleurs M2M ordonnées par priorité (1re = principale pour vignette + snapshot)
	colors: {
		select: {
			colorId: true,
			position: true,
			color: {
				select: {
					id: true,
					name: true,
					hex: true,
					slug: true,
				},
			},
		},
		orderBy: { position: "asc" as const },
	},
	// Matériaux M2M ordonnés (1er = principal)
	materials: {
		select: {
			materialId: true,
			position: true,
			material: {
				select: {
					id: true,
					name: true,
					slug: true,
				},
			},
		},
		orderBy: { position: "asc" as const },
	},

	// Images
	images: {
		select: {
			id: true,
			url: true,
			thumbnailUrl: true,
			blurDataUrl: true,
			altText: true,
			isPrimary: true,
			mediaType: true,
			width: true,
			height: true,
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

export const GET_PRODUCT_SKUS_DEFAULT_SORT_BY = "created-descending";
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

export const SKU_FILTERS_MIN_DATE = new Date("2020-01-01");
export const SKU_FILTERS_MAX_INVENTORY = 100000;
export const SKU_FILTERS_MAX_PRICE_CENTS = 99999999; // 999999.99€ en centimes
