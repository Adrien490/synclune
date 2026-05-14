"use client";

import { AdminCrossPageBanner } from "@/shared/components/admin/admin-cross-page-banner";

import { getFilteredOrderIds } from "../../actions/get-filtered-order-ids";
import { BULK_ORDER_ACTION_LIMIT, SORT_OPTIONS } from "../../constants/order.constants";
import type { GetOrdersParams, OrderFilters } from "../../types/order.types";

interface OrdersCrossPageBannerProps {
	totalCount: number;
	filterParams: {
		search?: string;
		sortBy?: GetOrdersParams["sortBy"];
		filters?: OrderFilters;
	};
	className?: string;
}

export function OrdersCrossPageBanner({
	totalCount,
	filterParams,
	className,
}: OrdersCrossPageBannerProps) {
	const params: Pick<GetOrdersParams, "search" | "sortBy" | "filters"> = {
		search: filterParams.search,
		sortBy: filterParams.sortBy ?? SORT_OPTIONS.CREATED_DESC,
		filters: filterParams.filters,
	};
	return (
		<AdminCrossPageBanner
			totalCount={totalCount}
			filterParams={params}
			getFilteredIds={getFilteredOrderIds}
			cap={BULK_ORDER_ACTION_LIMIT}
			itemLabel={{ singular: "commande", plural: "commandes" }}
			className={className}
		/>
	);
}
