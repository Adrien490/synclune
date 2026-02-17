import { Prisma, MediaType } from "@/app/generated/prisma/client";
import type { ColorSwatch, ProductFromList, SkuFromList } from "./product-list.types";
import type {
	StockStatus as SharedStockStatus,
	ProductStockInfo as SharedProductStockInfo,
	ProductVariantInfo as SharedProductVariantInfo,
} from "@/shared/types/product-sku.types";

// Re-export des types depuis product.types.ts (source de vérité)
export type { ProductSku, ProductType } from "./product.types";

// Re-export depuis shared (évite la dépendance circulaire)
export type ProductVariantInfo = SharedProductVariantInfo;
export type StockStatus = SharedStockStatus;
export type ProductStockInfo = SharedProductStockInfo;

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
	mediaType: MediaType;
	blurDataURL?: string;
	source: "default" | "selected" | "sku";
	skuId?: string;
};

// ============================================================================
// PRODUCT STOCK (types exportés en haut du fichier depuis shared)
// ============================================================================

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
// PRODUCT CARD DATA (re-export depuis product.types.ts - source de vérité)
// ============================================================================

export type { ProductCardData } from "./product.types";
