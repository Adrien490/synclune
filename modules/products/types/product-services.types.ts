import { type Prisma } from "@/app/generated/prisma/client";
import type { StockStatus as SharedStockStatus } from "@/shared/types/product-sku.types";

// Re-export des types depuis product.types.ts (source de vérité)
export type { ProductSku } from "./product.types";

// Re-export depuis shared (évite la dépendance circulaire)
export type StockStatus = SharedStockStatus;

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
// PRODUCT HIGHLIGHTS
// ============================================================================

/**
 * Highlight produit pour améliorer la scanabilité.
 *
 * `id` est une union literal stable : permet aux consommateurs (UI) de mapper
 * chaque highlight à une icône via `satisfies Record<ProductHighlightId, ...>`
 * sans `as` et avec exhaustivité validée par TS.
 */
export type ProductHighlightId =
	| "material"
	| "color"
	| "handmade"
	| "french"
	| "adjustable"
	| "collection";

export type ProductHighlight = {
	id: ProductHighlightId;
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
