"use client";

import { AdminCrossPageBanner } from "@/shared/components/admin/admin-cross-page-banner";

import { getFilteredDiscountIds } from "../../actions/get-filtered-discount-ids";
import {
	BULK_DISCOUNT_ACTION_LIMIT,
	GET_DISCOUNTS_DEFAULT_SORT_BY,
} from "../../constants/discount.constants";
import type { DiscountFilters, GetDiscountsParams } from "../../types/discount.types";

interface DiscountsCrossPageBannerProps {
	totalCount: number;
	filterParams: {
		search?: string;
		sortBy?: GetDiscountsParams["sortBy"];
		filters?: DiscountFilters;
	};
	className?: string;
}

export function DiscountsCrossPageBanner({
	totalCount,
	filterParams,
	className,
}: DiscountsCrossPageBannerProps) {
	const params: Pick<GetDiscountsParams, "search" | "sortBy" | "filters"> = {
		search: filterParams.search,
		sortBy: filterParams.sortBy ?? GET_DISCOUNTS_DEFAULT_SORT_BY,
		filters: filterParams.filters,
	};
	return (
		<AdminCrossPageBanner
			totalCount={totalCount}
			filterParams={params}
			getFilteredIds={getFilteredDiscountIds}
			cap={BULK_DISCOUNT_ACTION_LIMIT}
			itemLabel={{ singular: "code promo", plural: "codes promo" }}
			className={className}
		/>
	);
}
