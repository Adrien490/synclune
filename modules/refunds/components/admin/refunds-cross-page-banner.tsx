"use client";

import { AdminCrossPageBanner } from "@/shared/components/admin/admin-cross-page-banner";

import { getFilteredRefundIds } from "../../actions/get-filtered-refund-ids";
import { BULK_REFUND_ACTION_LIMIT, SORT_OPTIONS } from "../../constants/refund.constants";
import type { GetRefundsParams, RefundFilters } from "../../types/refund.types";

interface RefundsCrossPageBannerProps {
	totalCount: number;
	filterParams: {
		search?: string;
		sortBy?: GetRefundsParams["sortBy"];
		filters?: RefundFilters;
	};
	className?: string;
}

export function RefundsCrossPageBanner({
	totalCount,
	filterParams,
	className,
}: RefundsCrossPageBannerProps) {
	const params: Pick<GetRefundsParams, "search" | "sortBy" | "filters"> = {
		search: filterParams.search,
		sortBy: filterParams.sortBy ?? SORT_OPTIONS.CREATED_DESC,
		filters: filterParams.filters,
	};
	return (
		<AdminCrossPageBanner
			totalCount={totalCount}
			filterParams={params}
			getFilteredIds={getFilteredRefundIds}
			cap={BULK_REFUND_ACTION_LIMIT}
			itemLabel={{ singular: "remboursement", plural: "remboursements" }}
			className={className}
		/>
	);
}
