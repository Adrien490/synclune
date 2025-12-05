/**
 * Module Products - Barrel exports
 *
 * Ce fichier centralise les exports publics du module products
 * pour simplifier les imports depuis l'extérieur du module.
 */

// =============================================================================
// Data Fetching
// =============================================================================
export { getProducts } from "./data/get-products";
export { getProductBySlug } from "./data/get-product";
export { getRelatedProducts } from "./data/get-related-products";
export { getMaxProductPrice } from "./data/get-max-product-price";
export { getProductCountsByStatus } from "./data/get-product-counts-by-status";

// =============================================================================
// Types
// =============================================================================
export type {
	Product,
	ProductFilters,
	GetProductsParams,
	GetProductsReturn,
	GetProductReturn,
	ProductSku,
	SortField,
} from "./types/product.types";

export type {
	GetRelatedProductsReturn,
} from "./types/related-products.types";

export type {
	ProductCountsByStatus,
} from "./types/product-counts.types";

// =============================================================================
// Constants
// =============================================================================
export {
	PRODUCTS_CACHE_TAGS,
	getProductInvalidationTags,
} from "./constants/cache";


// =============================================================================
// Schemas (pour validation côté client)
// =============================================================================
export {
	productFiltersSchema,
	productSortBySchema,
} from "./schemas/product.schemas";

// =============================================================================
// Components (publics)
// =============================================================================
export { ProductCard } from "./components/product-card";
export { ProductList } from "./components/product-list";
export { ProductCarousel } from "./components/product-carousel";
export { RelatedProducts } from "./components/related-products";

// =============================================================================
// Services (helpers utilitaires)
// =============================================================================
export {
	getPrimaryImageForList,
	getPrimaryPriceForList,
	getStockInfoForList,
} from "./services/product-list-helpers";
