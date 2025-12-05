import type { Product } from "./product.types";

// ============================================================================
// ENTITY TYPES
// ============================================================================

/**
 * @deprecated Utiliser Product directement - getRelatedProducts retourne maintenant Product[]
 */
export type RelatedProduct = Product;

export type GetRelatedProductsReturn = Product[];
