import { ProductStatus } from "@/app/generated/prisma/client";
import { searchParamParsers } from "@/shared/utils/parse-search-params";
import { GET_PRODUCTS_SORT_FIELDS } from "../constants/product.constants";

/**
 * Parse and validate product search parameters from URL
 * Returns safe, validated parameters with defaults for invalid values
 */
export function parseProductParams(searchParams: {
	[key: string]: string | string[] | undefined;
}) {
	// Parse status separately to allow undefined (= all statuses)
	const statusParam = Array.isArray(searchParams.status)
		? searchParams.status[0]
		: searchParams.status;

	const validStatuses = [
		ProductStatus.PUBLIC,
		ProductStatus.DRAFT,
		ProductStatus.ARCHIVED,
	] as const;

	const status =
		statusParam && validStatuses.includes(statusParam as ProductStatus)
			? (statusParam as ProductStatus)
			: undefined; // undefined = affiche tous les statuts

	return {
		cursor: searchParamParsers.cursor(searchParams.cursor),
		direction: searchParamParsers.direction(searchParams.direction),
		perPage: searchParamParsers.perPage(searchParams.perPage, 10, 100),
		sortBy: searchParamParsers.sortBy(
			searchParams.sortBy,
			GET_PRODUCTS_SORT_FIELDS,
			"created-descending" as const
		) as (typeof GET_PRODUCTS_SORT_FIELDS)[number],
		search: searchParamParsers.search(searchParams.search),
		status,
	};
}
