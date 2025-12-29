import { Prisma } from "@/app/generated/prisma/client";
import type { ColorSwatch, ProductFromList, SkuFromList } from "./product-list.types";

// Re-export des types depuis product.types.ts (source de vérité)
export type {
	ProductSku,
	ProductType,
	ProductVariantInfo,
} from "./product.types";

// ============================================================================
// TYPES SPÉCIFIQUES AUX SERVICES
// ============================================================================

export type SkuVariant = {
	sku: string;
	color?: {
		id: string;
		slug: string;
		name: string;
		hex: string;
	};
	material?: string;
	size?: string;
	priceInclTax: number;
	compareAtPrice?: number;
	inventory: number;
	isActive: boolean;
	images: Array<{
		id: string;
		url: string;
		altText?: string;
		isPrimary: boolean;
	}>;
};

// ============================================================================
// PRODUCT MEDIA
// ============================================================================

export type ProductImage = {
	id: string;
	url: string;
	alt: string;
	mediaType: "IMAGE" | "VIDEO";
	blurDataURL?: string;
	source: "default" | "selected" | "sku";
	skuId?: string;
};

// ============================================================================
// PRODUCT STOCK
// ============================================================================

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export type ProductStockInfo = {
	status: StockStatus;
	totalInventory: number;
	availableSkus: number;
	message: string;
};

// ============================================================================
// PRODUCT PRICING (from services/)
// ============================================================================

export interface PriceInfo {
	minPrice: number;
	maxPrice: number;
	hasMultiplePrices: boolean;
}

export interface SkuForPricing {
	isActive: boolean;
	priceInclTax: number;
	compareAtPrice?: number | null;
	inventory?: number;
}

// ============================================================================
// PRODUCT JEWELRY
// ============================================================================

export type JewelryDimensions = {
	// Dimensions textuelles
	dimensions?: string;

	// Informations dérivées
	requiresSize: boolean;
};

// ============================================================================
// PRODUCT HIGHLIGHTS
// ============================================================================

/**
 * Highlight produit pour améliorer la scanabilité
 */
export type ProductHighlight = {
	id: string;
	label: string;
	description: string;
	priority: number;
};

// ============================================================================
// SEARCH TYPES
// ============================================================================

/**
 * Résultat de la recherche hybride (fuzzy + exact)
 */
export type SearchResult = {
	/** IDs de produits triés par pertinence (fuzzy search) */
	fuzzyIds: string[] | null;
	/** Conditions de recherche exacte (SKU, couleurs, etc.) */
	exactConditions: Prisma.ProductWhereInput[];
};

// ============================================================================
// PRODUCT CARD DATA
// ============================================================================

/**
 * Données combinées pour ProductCard (optimisé O(n))
 */
export interface ProductCardData {
	defaultSku: SkuFromList | null;
	price: number;
	compareAtPrice: number | null;
	stockInfo: ProductStockInfo;
	primaryImage: {
		id: string;
		url: string;
		alt?: string;
		mediaType: "IMAGE";
		blurDataUrl?: string;
	};
	colors: ColorSwatch[];
}
