"use client";

import { createProductFilterFormatter } from "@/app/(boutique)/produits/_utils/format-product-filter";
import { FilterBadges } from "@/shared/components/filter-badges";
import type { GetColorsReturn } from "@/modules/colors/data/get-colors";
import { useSearchParams } from "next/navigation";

interface ProductFilterBadgesProps {
	colors: GetColorsReturn["colors"];
	className?: string;
}

/**
 * Composant pour afficher les filtres actifs de produits
 * Utilise le composant FilterBadges global avec formatage personnalisé
 */
export function ProductFilterBadges({
	colors,
	className,
}: ProductFilterBadgesProps) {
	const searchParams = useSearchParams();
	const formatFilter = createProductFilterFormatter(
		colors,
		searchParams
	);

	return (
		<FilterBadges
			formatFilter={formatFilter}
			className={className}
			filterOptions={{ filterPrefix: "" }}
		/>
	);
}
