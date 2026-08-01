import type { RefundFilters } from "@/modules/refunds/types/refund.types";
import {
	GET_REFUNDS_DEFAULT_PER_PAGE,
	GET_REFUNDS_MAX_RESULTS_PER_PAGE,
	SORT_OPTIONS,
} from "@/modules/refunds/constants/refund.constants";
import { RefundReason, RefundStatus } from "@/app/generated/prisma/enums";
import { searchParamParsers } from "@/shared/utils/parse-search-params";
import { getFirstParam, getFirstParamIn } from "@/shared/utils/params";

import type { RefundsSearchParams } from "../page";

const REFUND_SORT_FIELDS = Object.values(SORT_OPTIONS);

/** Parse une date d'URL en rejetant les `Invalid Date` (`new Date("garbage")`). */
const parseDate = (raw: string): Date | undefined => {
	const date = new Date(raw);
	return Number.isNaN(date.getTime()) ? undefined : date;
};

/**
 * Parse and validate refund search parameters from URL
 */
export function parseRefundParams(searchParams: { [key: string]: string | string[] | undefined }) {
	return {
		cursor: searchParamParsers.cursor(searchParams.cursor),
		direction: searchParamParsers.direction(searchParams.direction),
		perPage: searchParamParsers.perPage(
			searchParams.perPage,
			GET_REFUNDS_DEFAULT_PER_PAGE,
			GET_REFUNDS_MAX_RESULTS_PER_PAGE,
		),
		sortBy: searchParamParsers.sortBy(
			searchParams.sortBy,
			REFUND_SORT_FIELDS,
			"created-descending" as const,
		) as (typeof REFUND_SORT_FIELDS)[number],
		search: searchParamParsers.search(searchParams.search),
	};
}

export const parseRefundFilters = (params: RefundsSearchParams): RefundFilters => {
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
					// Appartenance à l'enum contrôlée : un cast nu laissait une valeur
					// d'URL arbitraire atteindre `getRefundsSchema` (cf. le parseur des
					// commandes, où le même motif produisait un 500).
					case "status":
						status = getFirstParamIn(filterValue, Object.values(RefundStatus));
						break;
					case "reason":
						reason = getFirstParamIn(filterValue, Object.values(RefundReason));
						break;
					// `new Date("garbage")` produit un `Invalid Date` — accepté par le
					// type `Date`, rejeté par le schéma en aval.
					case "createdAfter":
						createdAfter = parseDate(filterValue);
						break;
					case "createdBefore":
						createdBefore = parseDate(filterValue);
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
