"use client";

import { AdminCrossPageBanner } from "@/shared/components/admin/admin-cross-page-banner";

import { getFilteredMaterialIds } from "../../actions/get-filtered-material-ids";
import {
	BULK_MATERIAL_ACTION_LIMIT,
	GET_MATERIALS_DEFAULT_SORT_BY,
} from "../../constants/materials.constants";
import type { GetMaterialsParams, MaterialFilters } from "../../types/materials.types";

interface MaterialsCrossPageBannerProps {
	totalCount: number;
	filterParams: {
		search?: string;
		sortBy?: GetMaterialsParams["sortBy"];
		filters?: MaterialFilters;
	};
	className?: string;
}

export function MaterialsCrossPageBanner({
	totalCount,
	filterParams,
	className,
}: MaterialsCrossPageBannerProps) {
	const params: Pick<GetMaterialsParams, "search" | "sortBy" | "filters"> = {
		search: filterParams.search,
		sortBy: filterParams.sortBy ?? GET_MATERIALS_DEFAULT_SORT_BY,
		filters: filterParams.filters ?? {},
	};
	return (
		<AdminCrossPageBanner
			totalCount={totalCount}
			filterParams={params}
			getFilteredIds={getFilteredMaterialIds}
			cap={BULK_MATERIAL_ACTION_LIMIT}
			itemLabel={{ singular: "matériau", plural: "matériaux" }}
			className={className}
		/>
	);
}
