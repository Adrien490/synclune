"use client";

import { AdminCrossPageBanner } from "@/shared/components/admin/admin-cross-page-banner";

import { getFilteredProductTypeIds } from "../../actions/get-filtered-product-type-ids";
import {
	BULK_PRODUCT_TYPE_ACTION_LIMIT,
	GET_PRODUCT_TYPES_DEFAULT_SORT_BY,
} from "../../constants/product-type.constants";
import type { GetProductTypesParams, ProductTypeFilters } from "../../types/product-type.types";

interface ProductTypesCrossPageBannerProps {
	totalCount: number;
	filterParams: {
		search?: string;
		sortBy?: GetProductTypesParams["sortBy"];
		filters?: ProductTypeFilters;
	};
	className?: string;
}

export function ProductTypesCrossPageBanner({
	totalCount,
	filterParams,
	className,
}: ProductTypesCrossPageBannerProps) {
	const params: Pick<GetProductTypesParams, "search" | "sortBy" | "filters"> = {
		search: filterParams.search,
		sortBy: filterParams.sortBy ?? GET_PRODUCT_TYPES_DEFAULT_SORT_BY,
		filters: filterParams.filters ?? {},
	};
	return (
		<AdminCrossPageBanner
			totalCount={totalCount}
			filterParams={params}
			getFilteredIds={getFilteredProductTypeIds}
			cap={BULK_PRODUCT_TYPE_ACTION_LIMIT}
			itemLabel={{ singular: "type", plural: "types" }}
			className={className}
		/>
	);
}
