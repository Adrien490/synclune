import type { DashboardBaseSearchParams } from "@/shared/types/search-params";

/**
 * Collection filters for dashboard (with filter_ prefix in URL)
 */
export type CollectionFiltersSearchParams = {
	filter_hasProducts?: string; // "true" | "false"
};

/**
 * Complete collections search params for dashboard
 */
export type CollectionsSearchParams = DashboardBaseSearchParams &
	CollectionFiltersSearchParams;

/**
 * Parsed collection filters (after conversion)
 */
export type ParsedCollectionFilters = {
	hasProducts?: boolean;
};
