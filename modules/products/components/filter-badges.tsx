"use client";

import { Suspense, type ComponentProps } from "react";
import { badgeAccentForFilterKey } from "@/modules/products/components/catalog-accents.constants";
import { createProductFilterFormatter } from "@/modules/products/utils/format-product-filter";
import { FilterBadges } from "@/shared/components/filter-badges";
import type { GetColorsReturn } from "@/modules/colors/data/get-colors";
import type { MaterialOption } from "@/modules/materials/data/get-material-options";
import type { FilterDefinition } from "@/shared/hooks/use-filter";
import { useFilter } from "@/shared/hooks/use-filter";
import { getCategorySlugFromPath } from "@/modules/products/services/product-filter-params.service";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

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
	// Plus de prop `activeProductType` : elle venait d'un `await params` de la
	// page, ce qui enfermait le bandeau dans son trou dynamique. Il se dérive du
	// pathname + de la liste (cachée) des types, cf. plus bas.
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
}: ProductFilterBadgesProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	/**
	 * Type venant du PATH (`/produits/[productTypeSlug]`), et son libellé lu dans
	 * la liste des types — celle-là même qui alimente les cases du meuble.
	 *
	 * ⚠️ Repli sur le slug plutôt que sur `undefined` : `activeProductType` ne
	 * porte pas que l'affichage, il décide aussi que « Tout effacer » navigue
	 * vers `/produits` (plus bas). Un type sans aucun bijou publié est absent de
	 * la liste (`hasProducts: true` côté `getCatalogData`) ; sur SA page, mieux
	 * vaut une étiquette au slug brut qu'un bandeau muet dont on ne peut plus
	 * sortir. Ce cas est déjà `noindex` (thin content).
	 */
	const categorySlug = getCategorySlugFromPath(pathname);
	const activeProductType = categorySlug
		? {
				slug: categorySlug,
				label: productTypes.find((type) => type.slug === categorySlug)?.label ?? categorySlug,
			}
		: undefined;
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
	const withCategoryType: FilterDefinition[] = activeProductType
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

	// `search` est exclu des filtres de `useFilter` (clé réservée), mais depuis
	// le retrait du champ de recherche inline du catalogue (2026-08-06) cette
	// étiquette est la SEULE affordance qui efface `?search=` — sans elle, sortir
	// d'une recherche demanderait de re-naviguer à la main. Le formatter la rend
	// déjà (« Recherche : "bague" »).
	const searchTerm = searchParams.get("search");
	const allActiveFilters: FilterDefinition[] = searchTerm
		? [
				{
					id: "search",
					key: "search",
					value: searchTerm,
					label: "Recherche",
					displayValue: `"${searchTerm}"`,
				},
				...withCategoryType,
			]
		: withCategoryType;

	const handleRemove = (key: string, value?: string) => {
		if (key === "search") {
			// Hors du modèle `useFilter` (clé réservée) : suppression directe dans
			// l'URL, curseur remis à zéro — le même contrat que `buildFilterURL`.
			const params = new URLSearchParams(searchParams.toString());
			params.delete("search");
			params.delete("cursor");
			params.delete("direction");
			const query = params.toString();
			router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
		} else if (key === "categoryType") {
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
