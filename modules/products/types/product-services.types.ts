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
