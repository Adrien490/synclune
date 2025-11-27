import { getFirstParam } from "@/shared/utils/params";
import { DiscountType } from "@/app/generated/prisma/client";
import type { DiscountFilters } from "@/modules/discount/types/discount.types";
import type { DiscountsSearchParams } from "../page";

export function parseFilters(params: DiscountsSearchParams): DiscountFilters {
	const filters: DiscountFilters = {};

	const type = getFirstParam(params.type);
	if (type && Object.values(DiscountType).includes(type as DiscountType)) {
		filters.type = type as DiscountType;
	}

	const isActive = getFirstParam(params.isActive);
	if (isActive === "true") {
		filters.isActive = true;
	} else if (isActive === "false") {
		filters.isActive = false;
	}

	const hasUsages = getFirstParam(params.hasUsages);
	if (hasUsages === "true") {
		filters.hasUsages = true;
	} else if (hasUsages === "false") {
		filters.hasUsages = false;
	}

	const isExpired = getFirstParam(params.isExpired);
	if (isExpired === "true") {
		filters.isExpired = true;
	} else if (isExpired === "false") {
		filters.isExpired = false;
	}

	return filters;
}
