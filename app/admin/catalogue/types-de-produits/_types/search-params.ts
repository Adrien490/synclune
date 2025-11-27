import type { DashboardBaseSearchParams } from "@/shared/types/search-params";

/**
 * Product type filters for dashboard (with filter_ prefix in URL)
 */
export type ProductTypeFiltersSearchParams = {
	filter_isActive?: string; // "true" | "false"
	filter_hasSize?: string; // "true" | "false"
};

/**
 * Complete product types search params for dashboard
 */
export type ProductTypesSearchParams = DashboardBaseSearchParams &
	ProductTypeFiltersSearchParams & {
		sortOrder?: string; // "asc" | "desc"
	};

/**
 * Parsed product type filters (after conversion)
 */
export type ParsedProductTypeFilters = {
	isActive?: boolean;
	hasSize?: boolean;
};
