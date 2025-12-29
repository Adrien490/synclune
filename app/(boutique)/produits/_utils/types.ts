/**
 * Product filters search params (URL parameters)
 */
export type ProductFiltersSearchParams = {
	priceMin?: string;
	priceMax?: string;
	inStock?: string;
	type?: string | string[];
	color?: string | string[];
	material?: string | string[];
	collectionId?: string;
	collectionSlug?: string;
	rating?: string;
	stockStatus?: string;
	onSale?: string;
};

/**
 * Complete product search params (base + filters)
 */
export type ProductSearchParams = {
	cursor?: string;
	direction?: "forward" | "backward";
	perPage?: string;
	sortBy?: string;
	search?: string;
} & ProductFiltersSearchParams;
