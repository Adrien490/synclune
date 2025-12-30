"use client";

import { useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useFilter, type FilterDefinition } from "@/shared/hooks/use-filter";
import { FilterBadge } from "@/shared/components/filter-badge";
import { AnimatePresence } from "motion/react";
import {
	FILTER_LABELS,
	formatPrice,
} from "@/modules/products/constants/filter-labels.constants";

/**
 * Affiche les filtres actifs dans le NoResultsRecovery
 * Client Component pour la gestion des URL params
 */
export function NoResultsFilters() {
	const searchParams = useSearchParams();
	const containerRef = useRef<HTMLDivElement>(null);
	const {
		optimisticActiveFilters,
		removeFilterOptimistic,
		removeFiltersOptimistic,
	} = useFilter({ filterPrefix: "" });

	// Ne rien afficher s'il n'y a pas de filtres actifs
	if (optimisticActiveFilters.length === 0) {
		return null;
	}

	const handleRemove = (key: string, value?: string) => {
		if (key === "priceMin" || key === "priceMax") {
			// Supprimer les deux parametres de prix ensemble
			removeFiltersOptimistic(["priceMin", "priceMax"]);
		} else {
			removeFilterOptimistic(key, value);
		}

		// Gerer le focus apres suppression pour l'accessibilite
		requestAnimationFrame(() => {
			const firstBadge = containerRef.current?.querySelector("button");
			if (firstBadge) {
				firstBadge.focus();
			}
		});
	};

	// Formatter les filtres avec formatage monetaire
	const formatFilter = (filter: FilterDefinition) => {
		const { key, value } = filter;

		// Cas special pour le prix (combine min/max avec formatage monetaire)
		if (key === "priceMin") {
			const maxPrice = searchParams.get("priceMax");
			const minFormatted = formatPrice(String(value));
			const displayValue = maxPrice
				? `${minFormatted} - ${formatPrice(maxPrice)}`
				: `${minFormatted}+`;
			return { label: "Prix", displayValue };
		}

		// Ignorer priceMax (deja gere par priceMin)
		if (key === "priceMax") {
			return null;
		}

		return {
			label: FILTER_LABELS[key] || key,
			displayValue: String(value ?? ""),
		};
	};

	const filterCount = optimisticActiveFilters.length;
	const filterText =
		filterCount === 1 ? "1 filtre actif" : `${filterCount} filtres actifs`;

	return (
		<div
			ref={containerRef}
			role="region"
			aria-label="Filtres actifs"
			className="flex flex-wrap justify-start sm:justify-center gap-2"
		>
			{/* Annonce pour lecteurs d'ecran */}
			<div aria-live="polite" aria-atomic="true" className="sr-only">
				{filterText}
			</div>

			<AnimatePresence mode="popLayout">
				{optimisticActiveFilters.map((filter) => (
					<FilterBadge
						key={filter.id}
						filter={filter}
						formatFilter={formatFilter}
						onRemove={handleRemove}
					/>
				))}
			</AnimatePresence>
		</div>
	);
}
