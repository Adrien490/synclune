import type { RefundFilters } from "@/modules/refunds/types/refund.types";
import { SORT_OPTIONS } from "@/modules/refunds/constants/refund.constants";
import { searchParamParsers } from "@/shared/utils/parse-search-params";
import { getFirstParam } from "@/shared/utils/params";

import type { RefundsSearchParams } from "../page";

const REFUND_SORT_FIELDS = Object.values(SORT_OPTIONS);

/**
 * Parse and validate refund search parameters from URL
 */
export function parseRefundParams(searchParams: {
	[key: string]: string | string[] | undefined;
}) {
	return {
		cursor: searchParamParsers.cursor(searchParams.cursor),
		direction: searchParamParsers.direction(searchParams.direction),
		perPage: searchParamParsers.perPage(searchParams.perPage, 10, 100),
		sortBy: searchParamParsers.sortBy(
			searchParams.sortBy,
			REFUND_SORT_FIELDS,
			"created-descending" as const
		) as (typeof REFUND_SORT_FIELDS)[number],
		search: searchParamParsers.search(searchParams.search),
	};
}

export const parseRefundFilters = (
	params: RefundsSearchParams
): RefundFilters => {
	let status: RefundFilters["status"] = undefined;
	let reason: RefundFilters["reason"] = undefined;
	let createdAfter: Date | undefined = undefined;
	let createdBefore: Date | undefined = undefined;

	Object.entries(params).forEach(([key, value]) => {
		if (key.startsWith("filter_")) {
			const filterKey = key.replace("filter_", "");
			const filterValue = getFirstParam(value);

			if (filterValue) {
				switch (filterKey) {
					case "status":
						status = filterValue as RefundFilters["status"];
						break;
					case "reason":
						reason = filterValue as RefundFilters["reason"];
						break;
					case "createdAfter":
						createdAfter = new Date(filterValue);
						break;
					case "createdBefore":
						createdBefore = new Date(filterValue);
						break;
				}
			}
		}
	});

	return {
		status,
		reason,
		createdAfter,
		createdBefore,
	};
};
