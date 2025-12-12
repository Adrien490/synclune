"use client";

import { FilterBadges } from "@/shared/components/filter-badges";
import { FilterDefinition } from "@/shared/hooks/use-filter";

function formatProductTypeFilter(filter: FilterDefinition) {
	const filterKey = filter.key.replace("filter_", "");
	const value = filter.value as string;

	// Gestion du statut actif
	if (filterKey === "isActive") {
		return {
			label: "Statut",
			displayValue: value === "true" ? "Actif" : "Inactif",
		};
	}

	// Cas par défaut
	return {
		label: filterKey,
		displayValue: value,
	};
}

export function ProductTypesFilterBadges() {
	return <FilterBadges formatFilter={formatProductTypeFilter} />;
}
