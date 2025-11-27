import { searchParamParsers } from "@/shared/utils/parse-search-params";
import { GET_ORDERS_SORT_FIELDS } from "../constants/orders-constants";

/**
 * Parse and validate order search parameters from URL
 * Returns safe, validated parameters with defaults for invalid values
 */
export function parseOrderParams(searchParams: {
	[key: string]: string | string[] | undefined;
}) {
	return {
		cursor: searchParamParsers.cursor(searchParams.cursor),
		direction: searchParamParsers.direction(searchParams.direction),
		perPage: searchParamParsers.perPage(searchParams.perPage, 10, 100),
		sortBy: searchParamParsers.sortBy(
			searchParams.sortBy,
			GET_ORDERS_SORT_FIELDS,
			"created-descending" as const
		) as (typeof GET_ORDERS_SORT_FIELDS)[number],
		search: searchParamParsers.search(searchParams.search),
	};
}
