"use client";

import { createProductFilterFormatter } from "@/modules/products/utils/format-product-filter";
import { FilterBadges } from "@/shared/components/filter-badges";
import type { GetColorsReturn } from "@/modules/colors/data/get-colors";
import type { MaterialOption } from "@/modules/materials/data/get-material-options";
import type { FilterDefinition } from "@/shared/hooks/use-filter";
import { useFilter } from "@/shared/hooks/use-filter";
import { useRouter, useSearchParams } from "next/navigation";

interface ProductTypeOption {
	slug: string;
	label: string;
}

const EMPTY_PRODUCT_TYPES: ProductTypeOption[] = [];

interface ProductFilterBadgesProps {
	colors: GetColorsReturn["colors"];
	materials: MaterialOption[];
	productTypes?: ProductTypeOption[];
	className?: string;
	activeProductType?: { slug: string; label: string };
}

/**
 * Composant pour afficher les filtres actifs de produits
 * Utilise le composant FilterBadges global avec formatage personnalisé
 */
export function ProductFilterBadges({
	colors,
	materials,
	productTypes = EMPTY_PRODUCT_TYPES,
	className,
	activeProductType,
}: ProductFilterBadgesProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const {
		optimisticActiveFilters,
		removeFilterOptimistic,
		removeFiltersOptimistic,
		clearAllFiltersOptimistic,
	} = useFilter({ filterPrefix: "" });

	const formatFilter = createProductFilterFormatter(colors, materials, productTypes, searchParams);

	// Inject synthetic filter for path-based product type
	const allActiveFilters: FilterDefinition[] = activeProductType
		? [
				{
					id: "categoryType",
					key: "categoryType",
					value: activeProductType.slug,
					label: "Type",
					displayValue: activeProductType.label,
				},
				...optimisticActiveFilters,
			]
		: optimisticActiveFilters;

	const handleRemove = (key: string, value?: string) => {
		if (key === "categoryType") {
			// Navigate back to /produits with current search params
			const params = new URLSearchParams(searchParams.toString());
			// Re-add the type as a query param so existing filters are preserved
			params.set("page", "1");
			const query = params.toString();
			router.replace(query ? `/produits?${query}` : "/produits", { scroll: false });
		} else if (key === "priceMin") {
			removeFiltersOptimistic(["priceMin", "priceMax"]);
		} else {
			removeFilterOptimistic(key, value);
		}
	};

	const handleClearAll = () => {
		if (activeProductType) {
			// Navigate back to /produits without any filters
			router.replace("/produits", { scroll: false });
		} else {
			clearAllFiltersOptimistic();
		}
	};

	const formatFilterWithCategory = (filter: FilterDefinition) => {
		if (filter.key === "categoryType") {
			return { label: "Type", displayValue: filter.displayValue };
		}
		return formatFilter(filter);
	};

	return (
		<FilterBadges
			formatFilter={formatFilterWithCategory}
			className={className}
			activeFilters={allActiveFilters}
			onRemove={handleRemove}
			onClearAll={handleClearAll}
		/>
	);
}
