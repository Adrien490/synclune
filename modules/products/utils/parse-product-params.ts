import { searchParamParsers } from "@/shared/utils/parse-search-params";
import {
	GET_PRODUCTS_DEFAULT_PER_PAGE,
	GET_PRODUCTS_MAX_RESULTS_PER_PAGE,
	GET_PRODUCTS_SORT_FIELDS,
} from "../constants/product.constants";

/**
 * Parse and validate product search parameters from URL
 * Returns safe, validated parameters with defaults for invalid values
 */
export function parseProductParams(searchParams: { [key: string]: string | string[] | undefined }) {
	// Parse status — schéma lean : "active" | "inactive" (booléen `active` en base)
	const statusParam = Array.isArray(searchParams.status)
		? searchParams.status[0]
		: searchParams.status;

	const validStatuses = ["active", "inactive"] as const;

	// "all" or absent = undefined (tous statuts), otherwise validate the status
	const status =
		statusParam === "all" || !statusParam
			? undefined
			: validStatuses.includes(statusParam as (typeof validStatuses)[number])
				? (statusParam as (typeof validStatuses)[number])
				: undefined;

	return {
		cursor: searchParamParsers.cursor(searchParams.cursor),
		direction: searchParamParsers.direction(searchParams.direction),
		perPage: searchParamParsers.perPage(
			searchParams.perPage,
			GET_PRODUCTS_DEFAULT_PER_PAGE,
			GET_PRODUCTS_MAX_RESULTS_PER_PAGE,
		),
		sortBy: searchParamParsers.sortBy(
			searchParams.sortBy,
			GET_PRODUCTS_SORT_FIELDS,
			"created-descending" as const,
		) as (typeof GET_PRODUCTS_SORT_FIELDS)[number],
		search: searchParamParsers.search(searchParams.search),
		status,
	};
}
