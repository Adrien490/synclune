import type { PublicBaseSearchParams as BaseSearchParams } from "@/shared/types/search-params";

/**
 * Product filters search params (URL parameters)
 * These are converted to ProductFilters by parseFilters
 */
export type ProductFiltersSearchParams = {
	// Price filters (in euros in URL, converted to cents in code)
	priceMin?: string;
	priceMax?: string;

	// Boolean filters
	inStock?: string; // "true" | "false"

	// Multi-select filters
	type?: string | string[]; // Product type(s)
	material?: string | string[]; // Material(s)

	// String filters
	collectionId?: string;
	collectionSlug?: string;
};

/**
 * Complete product search params (base + filters)
 */
export type ProductSearchParams = BaseSearchParams & ProductFiltersSearchParams;
