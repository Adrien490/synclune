"use client";

import { Suspense, type ComponentProps } from "react";
import { badgeAccentForFilterKey } from "@/modules/products/components/catalog-accents.constants";
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
function ProductFilterBadgesInner({
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
		isPending,
	} = useFilter({ filterPrefix: "" });

	const formatFilter = createProductFilterFormatter(colors, materials, productTypes, searchParams);

	// priceMin, quand il est présent, porte la plage entière (« Prix : 20 € -
	// 65 € ») et sa suppression retire la paire : l'entrée priceMax est alors
	// retirée de la LISTE, pas seulement du rendu (le formatter rendait null
	// mais l'entrée gonflait le compte sr-only et consommait un slot
	// d'affichage à vide — c'était le « 10 » du trio de compteurs
	// contradictoires 9/10/5, audit 2026-08-05). ⚠️ Mais borne haute SEULE
	// (glisser uniquement la poignée droite laisse la borne basse au défaut,
	// donc hors URL), priceMax est l'unique trace du filtre : l'exclure
	// inconditionnellement faisait un filtre actif sans aucun badge — le
	// formatter le rend en « Prix : jusqu'à Y € ».
	const hasPriceMin = optimisticActiveFilters.some((filter) => filter.key === "priceMin");
	const visibleFilters = optimisticActiveFilters.filter(
		(filter) => filter.key !== "priceMax" || !hasPriceMin,
	);

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
				...visibleFilters,
			]
		: visibleFilters;

	const handleRemove = (key: string, value?: string) => {
		if (key === "categoryType") {
			// Retour à /produits en conservant les autres filtres actifs de l'URL.
			// Pas de `page=1` : aucun parseur ne lit `page` (pagination à curseur),
			// et ce paramètre fantôme faisait basculer la page en `noindex`.
			const params = new URLSearchParams(searchParams.toString());
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
			isPending={isPending}
			appearance="etiquette"
			getBadgeAccentClassName={(filter) => badgeAccentForFilterKey(filter.key)}
		/>
	);
}

export function ProductFilterBadges(props: ComponentProps<typeof ProductFilterBadgesInner>) {
	return (
		<Suspense fallback={null}>
			<ProductFilterBadgesInner {...props} />
		</Suspense>
	);
}
