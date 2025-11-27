"use client";

import { Button } from "@/shared/components/ui/button";
import { FilterDefinition, useFilter } from "@/shared/hooks/use-filter";
import { cn } from "@/shared/utils/cn";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { FilterBadge } from "./filter-badge";

interface FilterBadgesProps {
	/**
	 * Fonction pour transformer les filtres bruts en affichage lisible
	 * Si non fournie, affiche les valeurs brutes
	 */
	formatFilter?: (filter: FilterDefinition) => {
		label: string;
		displayValue?: string;
	} | null;
	/**
	 * Classe CSS supplémentaire
	 */
	className?: string;
	/**
	 * Texte à afficher avant les badges
	 * @default "Filtres actifs :"
	 */
	label?: string;
	/**
	 * Options pour le hook useFilter
	 */
	filterOptions?: {
		filterPrefix?: string;
		preservePage?: boolean;
	};
	/**
	 * Nombre maximum de badges à afficher avant de montrer "Voir plus"
	 * @default 5
	 */
	maxVisibleFilters?: number;
}

/**
 * Composant réutilisable pour afficher les filtres actifs sous forme de badges
 * Utilise le hook useFilter pour gérer l'état des filtres
 */
export function FilterBadges({
	formatFilter,
	className,
	label = "Filtres actifs :",
	filterOptions,
	maxVisibleFilters = 5,
}: FilterBadgesProps) {
	const { activeFilters, clearAllFilters, isPending, hasActiveFilters } =
		useFilter(filterOptions);
	const [showAll, setShowAll] = useState(false);

	// Ne rien afficher s'il n'y a pas de filtres actifs
	if (!hasActiveFilters || activeFilters.length === 0) {
		return null;
	}

	// Filtres à afficher (limités ou tous)
	const displayedFilters =
		showAll || activeFilters.length <= maxVisibleFilters
			? activeFilters
			: activeFilters.slice(0, maxVisibleFilters);
	const hasMoreFilters = activeFilters.length > maxVisibleFilters;

	return (
		<div
			role="region"
			aria-label="Filtres actifs"
			aria-live="polite"
			aria-atomic="false"
			className={cn(
				"flex flex-wrap items-start sm:items-center gap-1.5 sm:gap-2 mb-4",
				className
			)}
		>
			{/* Visually hidden count for screen readers */}
			<span id="filter-count-label" className="sr-only">
				{activeFilters.length} filtre{activeFilters.length > 1 ? "s" : ""} actif
				{activeFilters.length > 1 ? "s" : ""}
			</span>

			{/* Indicateur mobile du nombre de filtres */}
			<div className="sm:hidden w-full mb-1">
				<span className="text-xs text-muted-foreground font-medium">
					{activeFilters.length}{" "}
					{activeFilters.length > 1 ? "filtres actifs" : "filtre actif"}
				</span>
			</div>

			<span className="text-sm leading-normal text-muted-foreground mr-2 hidden sm:inline">
				{label}
			</span>

			<AnimatePresence mode="sync">
				{displayedFilters.map((filter) => (
					<FilterBadge
						key={filter.id}
						filter={filter}
						formatFilter={formatFilter}
						filterOptions={filterOptions}
					/>
				))}

				{/* Bouton "Voir plus/moins" */}
				{hasMoreFilters && (
					<motion.div
						key="show-more-button"
						initial={{ opacity: 0, scale: 0.9 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0.9 }}
						transition={{ duration: 0.15, ease: "easeOut" }}
					>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setShowAll(!showAll)}
							className="text-xs h-auto py-2 px-3 gap-1 min-h-[44px] sm:min-h-0"
							aria-label={
								showAll
									? "Afficher moins de filtres"
									: `Afficher ${activeFilters.length - maxVisibleFilters} filtres supplémentaires`
							}
						>
							{showAll ? (
								<>
									Voir moins
									<ChevronUp className="w-3 h-3" />
								</>
							) : (
								<>
									+{activeFilters.length - maxVisibleFilters} autres
									<ChevronDown className="w-3 h-3" />
								</>
							)}
						</Button>
					</motion.div>
				)}

				{/* Bouton "Tout effacer" */}
				{activeFilters.length > 1 && (
					<motion.div
						key="clear-all-button"
						initial={{ opacity: 0, scale: 0.9 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0.9 }}
						transition={{ duration: 0.15, ease: "easeOut" }}
					>
						<Button
							variant="ghost"
							size="sm"
							onClick={clearAllFilters}
							disabled={isPending}
							className="text-xs leading-normal text-muted-foreground hover:text-foreground underline ml-2 h-auto p-2 transition-colors min-h-[44px] sm:min-h-0"
							aria-label="Effacer tous les filtres"
						>
							Tout effacer
						</Button>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
