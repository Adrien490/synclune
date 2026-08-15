import { searchParamParsers } from "@/shared/utils/parse-search-params";
import { GET_PRODUCT_VARIANTS_SORT_FIELDS } from "../constants/variant.constants";

/**
 * Parse and validate product VARIANT search parameters from URL
 * Returns safe, validated parameters with defaults for invalid values
 */
export function parseProductVariantParams(searchParams: {
	[key: string]: string | string[] | undefined;
}) {
	return {
		cursor: searchParamParsers.cursor(searchParams.cursor),
		direction: searchParamParsers.direction(searchParams.direction),
		perPage: searchParamParsers.perPage(searchParams.perPage, 20, 200),
		sortBy: searchParamParsers.sortBy(
			searchParams.sortBy,
			GET_PRODUCT_VARIANTS_SORT_FIELDS,
			"created-descending" as const,
		) as (typeof GET_PRODUCT_VARIANTS_SORT_FIELDS)[number],
		search: searchParamParsers.search(searchParams.search),
	};
}
