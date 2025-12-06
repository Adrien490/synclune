"use client"

import { FilterBadges } from "@/shared/components/filter-badges"
import type { FilterDefinition } from "@/shared/hooks/use-filter"

function formatTestimonialFilter(filter: FilterDefinition) {
	const filterKey = filter.key
	const value = filter.value as string

	// Gestion du statut de publication
	if (filterKey === "isPublished") {
		return {
			label: "Statut",
			displayValue: value === "true" ? "Publiés" : "Brouillons",
		}
	}

	// Cas par défaut
	return {
		label: filterKey,
		displayValue: value,
	}
}

/**
 * Badges des filtres actifs pour les témoignages
 * Affiche les filtres appliqués avec possibilité de les supprimer
 */
export function TestimonialsFilterBadges() {
	return (
		<FilterBadges
			formatFilter={formatTestimonialFilter}
		/>
	)
}
