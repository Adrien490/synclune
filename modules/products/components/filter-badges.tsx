"use client";

import { createProductFilterFormatter } from "@/app/(boutique)/produits/_utils/format-product-filter";
import { FilterBadges } from "@/shared/components/filter-badges";
import type { GetColorsReturn } from "@/modules/colors/data/get-colors";
import type { MaterialOption } from "@/modules/materials/data/get-material-options";
import { useFilter } from "@/shared/hooks/use-filter";
import { useSearchParams } from "next/navigation";

interface ProductTypeOption {
	slug: string;
	label: string;
}

interface ProductFilterBadgesProps {
	colors: GetColorsReturn["colors"];
	materials: MaterialOption[];
	productTypes?: ProductTypeOption[];
	className?: string;
}

/**
 * Composant pour afficher les filtres actifs de produits
 * Utilise le composant FilterBadges global avec formatage personnalisé
 */
export function ProductFilterBadges({
	colors,
	materials,
	productTypes = [],
	className,
}: ProductFilterBadgesProps) {
	const searchParams = useSearchParams();
	const {
		optimisticActiveFilters,
		removeFilterOptimistic,
		removeFiltersOptimistic,
		clearAllFiltersOptimistic,
	} = useFilter({ filterPrefix: "" });

	const formatFilter = createProductFilterFormatter(
		colors,
		materials,
		productTypes,
		searchParams
	);

	const handleRemove = (key: string, value?: string) => {
		if (key === "priceMin") {
			// Supprimer les deux paramètres de prix ensemble
			removeFiltersOptimistic(["priceMin", "priceMax"]);
		} else {
			removeFilterOptimistic(key, value);
		}
	};

	return (
		<FilterBadges
			formatFilter={formatFilter}
			className={className}
			activeFilters={optimisticActiveFilters}
			onRemove={handleRemove}
			onClearAll={clearAllFiltersOptimistic}
		/>
	);
}
