"use client";

import { FilterBadges } from "@/shared/components/filter-badges";
import { type FilterDefinition } from "@/shared/hooks/use-filter";
import { formatStatusFilter } from "@/shared/utils/format-status-filter";

function formatProductTypeFilter(filter: FilterDefinition) {
	const filterKey = filter.key.replace("filter_", "");
	const value = filter.value as string;

	if (filterKey === "isActive") {
		return formatStatusFilter(value, "Actif", "Inactif");
	}

	return {
		label: filterKey,
		displayValue: value,
	};
}

export function ProductTypesFilterBadges() {
	return <FilterBadges formatFilter={formatProductTypeFilter} />;
}
