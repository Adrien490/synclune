"use client";

import { FilterBadges } from "@/shared/components/filter-badges";
import { type FilterDefinition } from "@/shared/hooks/use-filter";
import { formatStatusFilter } from "@/shared/utils/format-status-filter";

function formatMaterialFilter(filter: FilterDefinition) {
	const filterKey = filter.key.replace("filter_", "");
	const value = filter.value as string;

	if (filterKey === "isActive") {
		return formatStatusFilter(value);
	}

	return {
		label: filterKey,
		displayValue: value,
	};
}

export function MaterialsFilterBadges() {
	return <FilterBadges formatFilter={formatMaterialFilter} />;
}
