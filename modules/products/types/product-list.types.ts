/**
 * Types pour les listes de produits (ProductCard, carousels, etc.)
 * Ces types travaillent avec les données minimales de get-products
 */

import type { ProductCarouselItem } from "@/modules/products/types/product.types";

/**
 * Produit consommé par ProductCard / getProductCardData.
 * Basé sur PRODUCT_CAROUSEL_SELECT (sous-ensemble de GET_PRODUCTS_SELECT).
 * Un Product (payload PLP) reste assignable ici via typage structurel.
 */
export type ProductFromList = ProductCarouselItem;

/** SKU tel que retourné dans ProductFromList */
export type SkuFromList = ProductFromList["skus"][0];

// Re-export ColorSwatch depuis shared pour rétrocompatibilité
export type { ColorSwatch } from "@/shared/types/product-sku.types";
