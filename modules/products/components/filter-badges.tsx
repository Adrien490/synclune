"use client";

import { createProductFilterFormatter } from "@/app/(boutique)/produits/_utils/format-product-filter";
import { FilterBadges } from "@/shared/components/filter-badges";
import type { GetColorsReturn } from "@/modules/colors/data/get-colors";
import type { MaterialOption } from "@/modules/materials/data/get-materials";
import { useSearchParams } from "next/navigation";

interface ProductFilterBadgesProps {
	colors: GetColorsReturn["colors"];
	materials: MaterialOption[];
	className?: string;
}

/**
 * Composant pour afficher les filtres actifs de produits
 * Utilise le composant FilterBadges global avec formatage personnalisé
 */
export function ProductFilterBadges({
	colors,
	materials,
	className,
}: ProductFilterBadgesProps) {
	const searchParams = useSearchParams();
	const formatFilter = createProductFilterFormatter(
		colors,
		materials,
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
