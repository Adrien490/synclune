import type { DashboardBaseSearchParams } from "@/shared/types/search-params";

/**
 * Refund filters for dashboard (with filter_ prefix in URL)
 */
export type RefundFiltersSearchParams = {
	filter_status?: string;
	filter_reason?: string;
	filter_createdAfter?: string; // ISO date string
	filter_createdBefore?: string; // ISO date string
};

/**
 * Complete refunds search params for dashboard
 */
export type RefundsSearchParams = DashboardBaseSearchParams &
	RefundFiltersSearchParams;
