import { Prisma } from "@/app/generated/prisma/client";

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
		},
	},
	material: true,

	// Images
	images: {
		select: {
			id: true,
			url: true,
			altText: true,
			isPrimary: true,
			mediaType: true,
		},
		orderBy: [
			{ isPrimary: "desc" as const },
			{ createdAt: "asc" as const },
		],
	},

	// Comptage des relations
	_count: {
		select: {
			images: true,
			orderItems: true,
		},
	},
} as const satisfies Prisma.ProductSkuSelect;

// Pagination par défaut
export const GET_PRODUCT_SKUS_DEFAULT_PER_PAGE = 20;
export const GET_PRODUCT_SKUS_MAX_RESULTS_PER_PAGE = 200;

export const GET_PRODUCT_SKUS_DEFAULT_PAGINATION = {
	page: 1,
	take: 20,
	perPage: 20,
} as const;

// Constantes pour le tri et filtrage
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
	"priority-descending",
	"priority-ascending",
] as const;

export const GET_PRODUCT_SKUS_DEFAULT_CACHE = {
	revalidate: 60 * 2, // 2 minutes (données de stock)
	stale: 60 * 5, // 5 minutes
	expire: 60 * 15, // 15 minutes
} as const;

// Labels pour l'interface utilisateur
export const SORT_LABELS: Record<string, string> = {
	"created-descending": "Date de création (plus récent)",
	"created-ascending": "Date de création (plus ancien)",
	"price-ascending": "Prix (croissant)",
	"price-descending": "Prix (décroissant)",
	"stock-ascending": "Stock (croissant)",
	"stock-descending": "Stock (décroissant)",
	"sku-ascending": "Référence (A-Z)",
	"sku-descending": "Référence (Z-A)",
	"priority-descending": "Priorité (haute)",
	"priority-ascending": "Priorité (basse)",
};
