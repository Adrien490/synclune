"use client"

import { DataTableToolbar } from "@/shared/components/data-table-toolbar"
import { SearchForm } from "@/shared/components/search-form"
import { SelectFilter } from "@/shared/components/select-filter"
import { TESTIMONIALS_SORT_LABELS } from "../../constants/testimonial.constants"
import { TestimonialsFilterSheet } from "./testimonials-filter-sheet"

/**
 * Barre d'outils pour la gestion des témoignages
 * Contient recherche, filtres rapides et panel de filtres avancés
 */
export function TestimonialsToolbar() {
	// Options de statut de publication
	const statusOptions = [
		{ value: "true", label: "Publiés" },
		{ value: "false", label: "Brouillons" },
	]

	// Options de tri depuis les constantes
	const sortOptions = Object.entries(TESTIMONIALS_SORT_LABELS).map(
		([value, label]) => ({
			value,
			label,
		})
	)

	return (
		<DataTableToolbar
			ariaLabel="Barre d'outils de gestion des témoignages"
			search={
				<SearchForm
					paramName="search"
					placeholder="Rechercher par nom ou contenu..."
					ariaLabel="Rechercher un témoignage par nom d'auteur ou contenu"
				/>
			}
		>
			<SelectFilter
				filterKey="isPublished"
				label="Statut"
				options={statusOptions}
				placeholder="Tous"
				className="w-full sm:min-w-[150px]"
			/>
			<SelectFilter
				filterKey="sortBy"
				label="Trier"
				options={sortOptions}
				placeholder="Date (récent)"
				className="w-full sm:min-w-[180px]"
			/>
			<TestimonialsFilterSheet />
		</DataTableToolbar>
	)
}
