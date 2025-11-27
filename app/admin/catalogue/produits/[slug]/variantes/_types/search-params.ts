import type { DashboardBaseSearchParams } from "@/shared/types/search-params";

/**
 * Product variant filters for dashboard
 */
export type ProductVariantFiltersSearchParams = {
	// Add any variant-specific filters here if needed in the future
};

/**
 * Complete product variant search params for dashboard
 */
export type ProductVariantsSearchParams = DashboardBaseSearchParams &
	ProductVariantFiltersSearchParams;
