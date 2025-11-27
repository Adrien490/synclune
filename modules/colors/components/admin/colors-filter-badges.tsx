"use client";

import { FilterBadges } from "@/shared/components/filter-badges";
import { FilterDefinition } from "@/shared/hooks/use-filter";

function formatColorFilter(filter: FilterDefinition) {
	const filterKey = filter.key.replace("filter_", "");
	const value = filter.value as string;

	// Gestion du statut actif
	if (filterKey === "isActive") {
		return {
			label: "Statut",
			displayValue: value === "true" ? "Actives" : "Inactives",
		};
	}

	// Cas par défaut
	return {
		label: filterKey,
		displayValue: value,
	};
}

export function ColorsFilterBadges() {
	return <FilterBadges formatFilter={formatColorFilter} />;
}
