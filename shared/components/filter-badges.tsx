"use client";

import { Button } from "@/shared/components/ui/button";
import { FilterDefinition, useFilter } from "@/shared/hooks/use-filter";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { cn } from "@/shared/utils/cn";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
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
	const {
		optimisticActiveFilters,
		removeFilterOptimistic,
		clearAllFiltersOptimistic,
		isPending,
		hasOptimisticActiveFilters,
	} = useFilter(filterOptions);
	const [showAll, setShowAll] = useState(false);
	const isMobile = useIsMobile();
	const shouldReduceMotion = useReducedMotion();

	// Utiliser les filtres optimistes pour une UX instantanée
	const activeFilters = optimisticActiveFilters;

	// Ne rien afficher s'il n'y a pas de filtres actifs
	if (!hasOptimisticActiveFilters || activeFilters.length === 0) {
		return null;
	}

	// Layout hybride : 2 lignes max sur mobile (~6 badges), plus sur desktop
	const mobileMaxFilters = 6;
	const effectiveMaxFilters = isMobile
		? Math.min(mobileMaxFilters, maxVisibleFilters)
		: maxVisibleFilters;

	// Filtres à afficher (limités ou tous)
	const displayedFilters =
		showAll || activeFilters.length <= effectiveMaxFilters
			? activeFilters
			: activeFilters.slice(0, effectiveMaxFilters);
	const hasMoreFilters = activeFilters.length > effectiveMaxFilters;

	return (
		<div
			role="region"
			aria-label="Filtres actifs"
			aria-live="polite"
			aria-atomic="true"
			data-pending={isPending ? "" : undefined}
			className={cn(
				"flex flex-wrap items-center gap-2 mb-4",
				className
			)}
		>
			{/* Visually hidden count for screen readers */}
			<span id="filter-count-label" className="sr-only">
				{activeFilters.length} filtre{activeFilters.length > 1 ? "s" : ""} actif
				{activeFilters.length > 1 ? "s" : ""}
			</span>

			<span className="text-sm leading-normal text-muted-foreground mr-2 hidden sm:inline">
				{label}
			</span>

			<AnimatePresence mode="popLayout">
				{displayedFilters.map((filter) => (
					<FilterBadge
						key={filter.id}
						filter={filter}
						formatFilter={formatFilter}
						onRemove={removeFilterOptimistic}
					/>
				))}

				{/* Bouton "Voir plus/moins" */}
				{hasMoreFilters && (
					<motion.div
						key="show-more-button"
						initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.9 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
						transition={
							shouldReduceMotion
								? { duration: 0 }
								: { duration: 0.15, ease: "easeOut" }
						}
					>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setShowAll(!showAll)}
							className={cn(
								"h-11 sm:h-8 px-3 gap-1.5",
								"rounded-full",
								"text-xs font-medium"
							)}
							aria-label={
								showAll
									? "Afficher moins de filtres"
									: `Afficher ${activeFilters.length - effectiveMaxFilters} filtres supplémentaires`
							}
						>
							{showAll ? (
								<>
									Voir moins
									<ChevronUp className="size-3" />
								</>
							) : (
								<>
									+{activeFilters.length - effectiveMaxFilters} autres
									<ChevronDown className="size-3" />
								</>
							)}
						</Button>
					</motion.div>
				)}

				{/* Bouton "Tout effacer" */}
				{activeFilters.length > 1 && (
					<motion.div
						key="clear-all-button"
						initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.9 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
						transition={
							shouldReduceMotion
								? { duration: 0 }
								: { duration: 0.15, ease: "easeOut" }
						}
					>
						<Button
							variant="ghost"
							size="sm"
							onClick={clearAllFiltersOptimistic}
							className={cn(
								"h-11 sm:h-8 px-3",
								"text-xs text-muted-foreground",
								"hover:text-destructive hover:bg-destructive/10",
								"underline underline-offset-2",
								"transition-colors"
							)}
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
