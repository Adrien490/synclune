import type { Role } from "@/app/generated/prisma/client";
import type { DashboardBaseSearchParams } from "@/shared/types/search-params";

/**
 * Customer filters for dashboard (with filter_ prefix in URL)
 */
export type CustomerFiltersSearchParams = {
	filter_role?: string; // Role enum value
	filter_emailVerified?: string; // "true" | "false"
	filter_hasOrders?: string; // "true" | "false"
	filter_includeDeleted?: string; // "true" | "false"
	filter_createdAfter?: string; // ISO date string
	filter_createdBefore?: string; // ISO date string
	filter_sortBy?: string;
	[key: string]: string | string[] | undefined; // Allow other string fields
};

/**
 * Complete customers search params for dashboard
 */
export type CustomersSearchParams = DashboardBaseSearchParams &
	CustomerFiltersSearchParams;

/**
 * Parsed customer filters (after conversion)
 */
export type ParsedCustomerFilters = {
	role?: Role;
	emailVerified?: boolean;
	hasOrders?: boolean;
	includeDeleted?: boolean;
	createdAfter?: Date;
	createdBefore?: Date;
	[key: string]: unknown; // Allow other string fields
};
