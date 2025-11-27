import type { DashboardBaseSearchParams } from "@/shared/types/search-params";

/**
 * Order filters for dashboard (with filter_ prefix in URL)
 */
export type OrderFiltersSearchParams = {
	filter_status?: string;
	filter_paymentStatus?: string;
	filter_totalMin?: string; // In euros, will be converted to cents
	filter_totalMax?: string; // In euros, will be converted to cents
	filter_createdAfter?: string; // ISO date string
	filter_createdBefore?: string; // ISO date string
	filter_showDeleted?: string; // "true" | "false"
	filter_sortBy?: string;
};

/**
 * Complete orders search params for dashboard
 */
export type OrdersSearchParams = DashboardBaseSearchParams &
	OrderFiltersSearchParams;
