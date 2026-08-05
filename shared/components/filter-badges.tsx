"use client";

import { MOTION_CONFIG, maybeReduceMotion } from "@/shared/components/animations/motion.config";
import { Button } from "@/shared/components/ui/button";
import { type FilterDefinition, useFilter } from "@/shared/hooks/use-filter";
import { cn } from "@/shared/utils/cn";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { CaretDownIcon, CaretUpIcon } from "@phosphor-icons/react/ssr";
import { useRef, useState } from "react";
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
		preservePagination?: boolean;
	};
	/**
	 * Nombre maximum de badges à afficher avant de montrer "Voir plus"
	 * @default 5
	 */
	maxVisibleFilters?: number;
	/**
	 * Filtres actifs externes (pour état optimistic géré par le parent)
	 * Si fourni, utilise ces filtres au lieu du hook interne
	 */
	activeFilters?: FilterDefinition[];
	/**
	 * Handler personnalisé pour la suppression de filtres
	 * Si fourni, remplace le comportement par défaut
	 */
	onRemove?: (key: string, value?: string) => void;
	/**
	 * Handler personnalisé pour effacer tous les filtres
	 * Si fourni, remplace le comportement par défaut
	 */
	onClearAll?: () => void;
	/**
	 * État pending externe (aria-busy). OBLIGATOIRE quand le parent contrôle
	 * via `activeFilters`/`onRemove` : les transitions courent alors dans SON
	 * instance de hook, et celle d'ici ne bouge jamais — `aria-busy` mentait
	 * en permanence sur le storefront (audit 2026-08-05, P2).
	 */
	isPending?: boolean;
	/**
	 * Habillage des badges et boutons. `pill` (défaut, admin) ou `etiquette`
	 * (storefront — « L'étiquette de bocal », artifact 2026-08-05).
	 */
	appearance?: "pill" | "etiquette";
	/**
	 * Classes d'accent de facette par badge (`etiquette` uniquement) —
	 * SSOT `FILTER_BADGE_ACCENTS`.
	 */
	getBadgeAccentClassName?: (filter: FilterDefinition) => string | undefined;
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
	activeFilters: activeFiltersProp,
	onRemove,
	onClearAll,
	isPending: isPendingProp,
	appearance = "pill",
	getBadgeAccentClassName,
}: FilterBadgesProps) {
	const {
		optimisticActiveFilters,
		removeFilterOptimistic,
		clearAllFiltersOptimistic,
		isPending: internalIsPending,
	} = useFilter(filterOptions);

	// Use external filters if provided, otherwise use internal hook
	const activeFilters = activeFiltersProp ?? optimisticActiveFilters;
	const handleRemove = onRemove ?? removeFilterOptimistic;
	const handleClearAll = onClearAll ?? clearAllFiltersOptimistic;
	const isPending = isPendingProp ?? internalIsPending;

	const [showAll, setShowAll] = useState(false);
	const shouldReduceMotion = useReducedMotion();
	const containerRef = useRef<HTMLDivElement>(null);

	// Move focus to the NEIGHBOUR badge after removal (same index, clamped),
	// or to "Clear all" if none left — le renvoi au PREMIER badge perdait la
	// position dans une longue liste (audit 2026-08-05, P3).
	const handleRemoveWithFocus = (key: string, value?: string) => {
		const before = containerRef.current?.querySelectorAll<HTMLButtonElement>(
			'button[aria-label^="Supprimer"]',
		);
		// L'élément supprimé RESTE dans le DOM pendant sa sortie AnimatePresence
		// (fondu 150 ms) : il faut l'exclure des cibles, sinon le focus se pose
		// sur un nœud en cours de démontage et retombe sur <body>.
		const removedElement = document.activeElement;
		const removedIndex = before ? Array.prototype.indexOf.call(before, removedElement) : -1;
		handleRemove(key, value);
		requestAnimationFrame(() => {
			const buttons = containerRef.current?.querySelectorAll<HTMLButtonElement>(
				'button[aria-label^="Supprimer"]',
			);
			const candidates = buttons
				? Array.prototype.filter.call(
						buttons,
						(button: HTMLButtonElement) => button !== removedElement,
					)
				: [];
			if (candidates.length > 0) {
				const index = removedIndex >= 0 ? Math.min(removedIndex, candidates.length - 1) : 0;
				(candidates[index] as HTMLButtonElement | undefined)?.focus();
			} else {
				containerRef.current
					?.querySelector<HTMLButtonElement>("button[data-clear-filters]")
					?.focus();
			}
		});
	};

	// Move focus to a logical target after clearing all filters
	const handleClearAllWithFocus = () => {
		const parent = containerRef.current?.parentElement;
		handleClearAll();
		requestAnimationFrame(() => {
			if (!parent) return;
			const target = parent.querySelector<HTMLElement>(
				'button, [href], input, select, [tabindex]:not([tabindex="-1"])',
			);
			target?.focus();
		});
	};

	// Don't render if no active filters
	if (activeFilters.length === 0) {
		return null;
	}

	// Filters to display (limited or all). L'ancien plafond mobile
	// `Math.min(6, maxVisibleFilters)` était une branche MORTE (min(6,5)=5,
	// aucun appelant ne passait la prop) et son `useIsMobile()` (md, 48rem)
	// divergeait du seuil CSS (sm, 40rem) — composant hybride interdit.
	const displayedFilters =
		showAll || activeFilters.length <= maxVisibleFilters
			? activeFilters
			: activeFilters.slice(0, maxVisibleFilters);
	const hasMoreFilters = activeFilters.length > maxVisibleFilters;

	const motionTransition = maybeReduceMotion(
		{ duration: MOTION_CONFIG.duration.fast },
		shouldReduceMotion ?? false,
	);

	return (
		<div
			ref={containerRef}
			role="region"
			aria-label="Filtres actifs"
			aria-live="polite"
			aria-busy={isPending}
			data-pending={isPending ? "" : undefined}
			className={cn("mb-4 flex flex-wrap items-center gap-2", className)}
		>
			{/* Visually hidden count for screen readers */}
			<span className="sr-only">
				{activeFilters.length} filtre{activeFilters.length > 1 ? "s" : ""} actif
				{activeFilters.length > 1 ? "s" : ""}
			</span>

			<span className="text-muted-foreground mr-2 hidden text-sm leading-normal sm:inline">
				{label}
			</span>

			<AnimatePresence mode="popLayout">
				{displayedFilters.map((filter) => (
					<FilterBadge
						key={filter.id}
						filter={filter}
						formatFilter={formatFilter}
						onRemove={handleRemoveWithFocus}
						appearance={appearance}
						accentClassName={getBadgeAccentClassName?.(filter)}
					/>
				))}

				{/* "Show more/less" button — 44 px, même échelle typo que les badges
				 * qu'il pilote ; nom accessible CONTENANT le libellé visible (2.5.3). */}
				{hasMoreFilters && (
					<m.div
						key="show-more-button"
						layout
						initial={shouldReduceMotion ? false : { opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={motionTransition}
					>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setShowAll(!showAll)}
							className={cn(
								"min-h-11 gap-1.5 px-3.5",
								"text-sm font-medium",
								appearance === "etiquette" ? "rounded-sm" : "rounded-full",
							)}
							aria-label={
								showAll
									? "Voir moins de filtres"
									: `+${activeFilters.length - maxVisibleFilters} autres filtres`
							}
						>
							{showAll ? (
								<>
									Voir moins
									<CaretUpIcon className="size-3" />
								</>
							) : (
								<>
									+{activeFilters.length - maxVisibleFilters} autres
									<CaretDownIcon className="size-3" />
								</>
							)}
						</Button>
					</m.div>
				)}

				{/* "Clear all" button — le nom accessible EST le libellé visible
				 * (2.5.3) ; le hover destructif est gaté `can-hover:` (sticky iOS). */}
				{activeFilters.length >= 1 && (
					<m.div
						key="clear-all-button"
						layout
						initial={shouldReduceMotion ? false : { opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={motionTransition}
					>
						<Button
							variant="ghost"
							size="sm"
							onClick={handleClearAllWithFocus}
							data-clear-filters=""
							className={cn(
								"min-h-11 px-3",
								"text-muted-foreground text-sm",
								"can-hover:hover:text-destructive can-hover:hover:bg-destructive/10",
								"underline underline-offset-2",
								"transition-colors",
							)}
						>
							Tout effacer
						</Button>
					</m.div>
				)}
			</AnimatePresence>
		</div>
	);
}
