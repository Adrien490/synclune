"use client";

import { createProductFilterFormatter } from "@/app/(boutique)/produits/_utils/format-product-filter";
import { FilterBadges } from "@/shared/components/filter-badges";
import type { GetColorsReturn } from "@/modules/colors/data/get-colors";
import type { MaterialOption } from "@/modules/materials/data/get-material-options";
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
	const formatFilter = createProductFilterFormatter(
		colors,
		materials,
		productTypes,
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
