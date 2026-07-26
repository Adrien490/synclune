"use client";

import { FilterBadges } from "@/shared/components/filter-badges";
import { type FilterDefinition } from "@/shared/hooks/use-filter";
import { formatStatusFilter } from "@/shared/utils/format-status-filter";

import { agree } from "../config/taxonomy.config";
import type { TaxonomyConfig } from "../types/taxonomy.types";

/**
 * Badges de filtres actifs des listes de taxonomies.
 *
 * Le seul filtre est le statut. Les trois modules l'affichaient différemment
 * (« Actives » au pluriel féminin, « Actifs », « Actif » au singulier) ; on
 * retient le singulier accordé, cohérent avec la feuille de filtres.
 */
export function TaxonomyFilterBadges({ config }: { config: TaxonomyConfig }) {
	const formatFilter = (filter: FilterDefinition) => {
		const filterKey = filter.key.replace("filter_", "");
		const value = filter.value as string;

		if (filterKey === "isActive") {
			return formatStatusFilter(value, agree(config, "Actif"), agree(config, "Inactif"));
		}

		return { label: filterKey, displayValue: value };
	};

	return <FilterBadges formatFilter={formatFilter} />;
}
