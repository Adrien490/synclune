import type { DashboardBaseSearchParams } from "@/shared/types/search-params";

/**
 * Product filters for dashboard (with filter_ prefix in URL)
 */
export type ProductFiltersSearchParams = {
	filter_priceMin?: string;
	filter_priceMax?: string;
	filter_isPublished?: string; // "true" | "false"
	filter_publishedAfter?: string; // ISO date string
	filter_publishedBefore?: string; // ISO date string
	filter_status?: string | string[]; // ProductStatus enum value(s)
	filter_labelId?: string | string[];
	filter_typeId?: string | string[];
	filter_collectionId?: string | string[];
	filter_stockStatus?: string | string[]; // "in_stock" | "out_of_stock"
	filter_sortBy?: string;
	filter_updatedAfter?: string;
	filter_updatedBefore?: string;
	filter_material?: string | string[];
	filter_collectionSlug?: string | string[];
	filter_inStock?: string;
	filter_withDeleted?: string;
	filter_createdAfter?: string;
	filter_createdBefore?: string;
};

/**
 * Complete product search params for dashboard
 */
export type ProductsSearchParams = DashboardBaseSearchParams &
	ProductFiltersSearchParams;
