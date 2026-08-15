import type { Prisma } from "@/app/generated/prisma/browser";

// ============================================================================
// SELECT DEFINITIONS — schéma lean (lot 2) : FK 1-N couleur/matériau,
// stock/active/priceCents (nullable → prix produit), média sur le PRODUIT.
// ============================================================================

export const GET_PRODUCT_VARIANT_SELECT = {
	id: true,
	productId: true,
	priceCents: true,
	stock: true,
	active: true,
	size: true,
	color: {
		select: { id: true, name: true, hex: true, position: true },
	},
	material: {
		select: { id: true, name: true, position: true },
	},
	product: {
		select: {
			id: true,
			slug: true,
			name: true,
			priceCents: true,
			active: true,
		},
	},
} as const satisfies Prisma.ProductVariantSelect;

// ============================================================================
// SELECT DEFINITIONS - LISTS
// ============================================================================

/**
 * SELECT complet — pour les détails et l'édition. Le média vit sur le produit :
 * la vignette d'une variante est celle de son produit.
 */
export const GET_PRODUCT_VARIANTS_DEFAULT_SELECT = {
	id: true,
	productId: true,
	priceCents: true,
	stock: true,
	active: true,
	size: true,
	color: {
		select: { id: true, name: true, hex: true, position: true },
	},
	material: {
		select: { id: true, name: true, position: true },
	},
	product: {
		select: {
			id: true,
			slug: true,
			name: true,
			description: true,
			priceCents: true,
			active: true,
			media: {
				where: { type: "IMAGE" as const },
				orderBy: [{ position: "asc" as const }, { id: "asc" as const }],
				take: 1,
				select: { id: true, url: true, alt: true, type: true },
			},
		},
	},
	_count: {
		select: {
			orderItems: true,
		},
	},
} as const satisfies Prisma.ProductVariantSelect;

// ============================================================================
// PAGINATION & SORTING
// ============================================================================

export const GET_PRODUCT_VARIANTS_DEFAULT_PER_PAGE = 20;
export const GET_PRODUCT_VARIANTS_MAX_RESULTS_PER_PAGE = 200;

export const GET_PRODUCT_VARIANTS_DEFAULT_SORT_BY = "created-descending";

export const GET_PRODUCT_VARIANTS_SORT_FIELDS = [
	"created-descending",
	"created-ascending",
	"price-ascending",
	"price-descending",
	"stock-ascending",
	"stock-descending",
] as const;

export const SORT_LABELS: Record<string, string> = {
	"created-descending": "Date de création (plus récent)",
	"created-ascending": "Date de création (plus ancien)",
	"price-ascending": "Prix (croissant)",
	"price-descending": "Prix (décroissant)",
	"stock-ascending": "Stock (croissant)",
	"stock-descending": "Stock (décroissant)",
};

export const VARIANT_FILTERS_MAX_STOCK = 100000;
export const VARIANT_FILTERS_MAX_PRICE_CENTS = 99999999; // 999999.99€ en centimes
