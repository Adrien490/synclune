/**
 * Base search params shared across all pages
 */
export type BaseSearchParams = {
	cursor?: string;
	direction?: "forward" | "backward";
	perPage?: string;
	sortBy?: string;
	search?: string;
};

/**
 * Base search params for public pages (with filter_sortBy)
 */
export type PublicBaseSearchParams = BaseSearchParams & {
	filter_sortBy?: string;
};

/**
 * Base search params for dashboard pages
 */
export type DashboardBaseSearchParams = BaseSearchParams;
