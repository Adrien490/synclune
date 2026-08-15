"use client";

import { FilterBadges } from "@/shared/components/filter-badges";
import { type FilterDefinition } from "@/shared/hooks/use-filter";

const COLLECTION_STATUS_LABELS: Record<string, string> = {
	true: "Publiées",
	false: "Brouillons",
};

function formatCollectionFilter(filter: FilterDefinition) {
	const filterKey = filter.key.replace("filter_", "");
	const value = filter.value as string;

	// Gestion du statut
	if (filterKey === "active") {
		const label = COLLECTION_STATUS_LABELS[String(value)];
		return label ? { label: "Statut", displayValue: label } : null;
	}

	// Gestion des bijoux
	if (filterKey === "hasProducts") {
		return {
			label: "Bijoux",
			displayValue: value === "true" ? "Avec bijoux" : "Sans bijoux",
		};
	}

	// Cas par défaut
	return {
		label: filterKey,
		displayValue: value,
	};
}

export function CollectionsFilterBadges() {
	return <FilterBadges formatFilter={formatCollectionFilter} />;
}
