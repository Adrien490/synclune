"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useOptimistic, useTransition } from "react";

import {
	buildFilterURL,
	buildClearFiltersURL,
	getCategorySlugFromPath,
	getDefaultFilterValues,
	isProductCategoryPage,
	parseFilterValuesFromURL,
	resetFilterGroup,
	type FilterFormData,
	type FilterSectionId,
} from "@/modules/products/services/product-filter-params.service";

export interface ImmediateProductFilters {
	/** Valeurs affichées : l'URL, recouverte de la dernière intention optimiste. */
	values: FilterFormData;
	/** Une navigation de filtre est en vol — alimente `data-pending`. */
	isPending: boolean;
	toggleToken: (
		group: "productTypes" | "colors" | "materials",
		slug: string,
		checked: boolean,
	) => void;
	setPriceRange: (range: [number, number]) => void;
	setAvailability: (field: "inStockOnly" | "onSale", checked: boolean) => void;
	resetSection: (section: FilterSectionId) => void;
	clearAll: () => void;
}

/**
 * Filtres appliqués À LA COCHE, sans bouton — le mode du rail desktop
 * (« Le plan de travail »).
 *
 * Reprend la mécanique de `shared/hooks/use-filter.ts` (`useOptimistic` +
 * `useTransition` + navigation `{ scroll: false }`) mais pas son modèle de
 * données : les clés produit sont structurées (`color`/`material`/`type`/
 * `priceMin`…) et surtout `buildFilterURL` change de **path** quand un seul
 * type est coché (`/produits` ↔ `/produits/[slug]`) — ce que le hook générique
 * ne sait pas faire. Les deux services d'URL sont donc réutilisés tels quels,
 * ce qui garantit que le rail et le panneau produisent des URL identiques.
 *
 * ⚠️ Pas de `withViewTransition` ni de `scrollToProductsGrid` ici : le rail est
 * collé à côté de la grille, rien ne se déplace, et la recomposition est portée
 * par le grisage `data-pending` déjà en place (`CATALOG_PENDING_DIM`).
 */
export function useImmediateProductFilters(params: {
	maxPriceInEuros: number;
	/** Type actif issu du segment de path, sur `/produits/[productTypeSlug]`. */
	activeProductTypeSlug?: string;
}): ImmediateProductFilters {
	const { maxPriceInEuros, activeProductTypeSlug } = params;

	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();

	const defaultPriceRange: [number, number] = [0, maxPriceInEuros];

	const urlValues = parseFilterValuesFromURL({
		searchParams,
		activeProductTypeSlug,
		defaultPriceRange,
	});

	// L'état optimiste EST le prochain jeu de valeurs : la coche se peint avant
	// que le RSC ait répondu, et retombe sur l'URL dès qu'elle a navigué.
	const [values, applyOptimistic] = useOptimistic(
		urlValues,
		(_current: FilterFormData, next: FilterFormData) => next,
	);

	const navigate = (next: FilterFormData) => {
		const { targetPath, fullUrl } = buildFilterURL({
			formData: next,
			currentSearchParams: searchParams,
			defaultPriceRange,
			isOnCategoryPage: isProductCategoryPage(pathname),
			currentCategorySlug: getCategorySlugFromPath(pathname),
		});

		startTransition(() => {
			applyOptimistic(next);
			// `push` quand le PATH change (`/produits` ↔ `/produits/[slug]`) : c'est
			// un vrai changement de page, le retour arrière doit le défaire. `replace`
			// pour un simple raffinement, sinon chaque coche empile une entrée
			// d'historique et le bouton Retour devient inutilisable.
			if (targetPath !== pathname) {
				router.push(fullUrl, { scroll: false });
			} else {
				router.replace(fullUrl, { scroll: false });
			}
		});
	};

	return {
		values,
		isPending,

		toggleToken: (group, slug, checked) => {
			const current = values[group];
			navigate({
				...values,
				[group]: checked ? [...current, slug] : current.filter((s) => s !== slug),
			});
		},

		// Le slider n'appelle ceci qu'au relâchement (`onValueCommitted` côté
		// `PriceRangeInputs`) : une navigation par frame de drag serait ingérable.
		setPriceRange: (range) => navigate({ ...values, priceRange: range }),

		setAvailability: (field, checked) => navigate({ ...values, [field]: checked }),

		resetSection: (section) => navigate(resetFilterGroup(values, section, defaultPriceRange)),

		clearAll: () => {
			const cleared = getDefaultFilterValues(defaultPriceRange);
			const fullUrl = buildClearFiltersURL(searchParams);
			startTransition(() => {
				applyOptimistic(cleared);
				router.push(fullUrl, { scroll: false });
			});
		},
	};
}
