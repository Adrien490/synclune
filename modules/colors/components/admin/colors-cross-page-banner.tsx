"use client";

import { AdminCrossPageBanner } from "@/shared/components/admin/admin-cross-page-banner";

import { getFilteredColorIds } from "../../actions/get-filtered-color-ids";
import {
	BULK_COLOR_ACTION_LIMIT,
	GET_COLORS_DEFAULT_SORT_BY,
} from "../../constants/color.constants";
import type { ColorFilters, GetColorsParams } from "../../types/color.types";

interface ColorsCrossPageBannerProps {
	totalCount: number;
	filterParams: {
		search?: string;
		sortBy?: GetColorsParams["sortBy"];
		filters?: ColorFilters;
	};
	className?: string;
}

export function ColorsCrossPageBanner({
	totalCount,
	filterParams,
	className,
}: ColorsCrossPageBannerProps) {
	const params: Pick<GetColorsParams, "search" | "sortBy" | "filters"> = {
		search: filterParams.search,
		sortBy: filterParams.sortBy ?? GET_COLORS_DEFAULT_SORT_BY,
		filters: filterParams.filters ?? {},
	};
	return (
		<AdminCrossPageBanner
			totalCount={totalCount}
			filterParams={params}
			getFilteredIds={getFilteredColorIds}
			cap={BULK_COLOR_ACTION_LIMIT}
			itemLabel={{ singular: "couleur", plural: "couleurs" }}
			className={className}
		/>
	);
}
