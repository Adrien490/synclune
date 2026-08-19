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
	/**
	 * Réchauffe la route qu'une coche VA ouvrir, au survol ou au focus.
	 *
	 * N'agit que si la coche change de PATH — c'est-à-dire, en pratique, sur le
	 * groupe « type ». Un raffinement de couleur ou de prix reste sur la même
	 * route : il n'y a rien à précharger.
	 */
	prefetchToken: (
		group: "productTypes" | "colors" | "materials",
		slug: string,
		checked: boolean,
	) => void;
	setPriceRange: (range: [number, number]) => void;
	setAvailability: (field: "inStockOnly", checked: boolean) => void;
	/** Tri appliqué immédiatement, par le même chemin d'URL que les filtres. */
	setSortBy: (value: string) => void;
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
 * ⚠️ Pas de fondu ni de `scrollToProductsGrid` ici : le rail est collé à côté
 * de la grille, rien ne se déplace, et la recomposition est portée par le
 * grisage `data-pending` déjà en place (`CATALOG_PENDING_DIM`).
 *
 * Concrètement : les navigations ci-dessous ne passent PAS
 * `PAGE_FADE_NAVIGATION`. La frontière `<ViewTransition>` du layout boutique
 * est en opt-in — sans le type, elle ne nomme même pas le `<main>` et aucune
 * transition ne démarre. Ne rien faire suffit donc à ne rien animer, et c'est
 * délibéré : le rail applique à la coche, un fondu de 200 ms par case cochée
 * serait un frein, pas un retour.
 */
export function useImmediateProductFilters(params: {
	maxPriceInEuros: number;
}): ImmediateProductFilters {
	const { maxPriceInEuros } = params;

	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();

	/**
	 * Type actif issu du segment de path, sur `/produits/[productTypeSlug]`.
	 *
	 * ⚠️ Il arrivait en PROP depuis la page, donc d'un `await params` : ça
	 * rattachait tout le meuble de filtres à une lecture d'URL serveur, et
	 * l'enfermait dans le trou dynamique de la page — il ne pouvait plus faire
	 * partie de l'App Shell. Le hook a déjà le `pathname` (il s'en sert plus bas
	 * pour `buildFilterURL`) : la valeur est la même, calculée un cran plus bas,
	 * et le rail se peint désormais dès la coquille.
	 */
	const activeProductTypeSlug = getCategorySlugFromPath(pathname) ?? undefined;

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

	const urlFor = (next: FilterFormData) =>
		buildFilterURL({
			formData: next,
			currentSearchParams: searchParams,
			defaultPriceRange,
			isOnCategoryPage: isProductCategoryPage(pathname),
			currentCategorySlug: getCategorySlugFromPath(pathname),
		});

	const withToken = (
		group: "productTypes" | "colors" | "materials",
		slug: string,
		checked: boolean,
	): FilterFormData => {
		const current = values[group];
		return {
			...values,
			[group]: checked ? [...current, slug] : current.filter((s) => s !== slug),
		};
	};

	const navigate = (next: FilterFormData) => {
		const { targetPath, fullUrl } = urlFor(next);

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

		toggleToken: (group, slug, checked) => navigate(withToken(group, slug, checked)),

		/**
		 * Prefetch d'INTENTION, pas au montage : `router.prefetch` réchauffe l'App
		 * Shell de la route cible, ce qui coûte une invocation serveur. Une par
		 * survol effectif, pas une par type affiché — à ~10 familles et un plan
		 * Neon Free, la différence n'est pas cosmétique.
		 *
		 * ⚠️ Ne vaut que parce que l'App Shell des routes `/produits` porte
		 * désormais le meuble de filtres (2026-08-07). Tant que les pages
		 * awaitaient leurs `searchParams`, cette coquille se réduisait au squelette
		 * pleine page : la réchauffer n'aurait rien avancé.
		 */
		prefetchToken: (group, slug, checked) => {
			const { targetPath, fullUrl } = urlFor(withToken(group, slug, checked));
			if (targetPath !== pathname) {
				router.prefetch(fullUrl);
			}
		},

		// Le slider n'appelle ceci qu'au relâchement (`onValueCommitted` côté
		// `PriceRangeInputs`) : une navigation par frame de drag serait ingérable.
		setPriceRange: (range) => navigate({ ...values, priceRange: range }),

		setAvailability: (field, checked) => navigate({ ...values, [field]: checked }),

		setSortBy: (value) => navigate({ ...values, sortBy: value }),

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
