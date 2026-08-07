import type { ProductFilters, SortField } from "@/modules/products/data/get-products";

/**
 * Ce que le shell catalogue tire des `searchParams`, **résolu derrière une
 * frontière `Suspense`**.
 *
 * @description
 * Ces valeurs demandent toutes un `await searchParams`. Passées en props
 * résolues, elles forçaient ce `await` au niveau supérieur des deux `page.tsx` —
 * sous `cacheComponents`, la page devenait alors entièrement dynamique et son
 * App Shell se réduisait au squelette PLEINE PAGE de `loading.tsx`, affiché à
 * chaque changement de filtre. Regroupées en UNE promesse, elles se résolvent
 * dans un enfant suspendu, et le meuble de filtres (qui, lui, ne dépend que de
 * données `"use cache"`) remonte dans la coquille.
 *
 * ⚠️ `sortBy` et `filters` ne sont pas décoratifs : ils descendent jusqu'au
 * load-more mobile et pilotent sa `key` de remount
 * (@regression catalog-loadmore-filter-parity). `filters` porte le type du PATH
 * déjà FUSIONNÉ sur une page catégorie — passer les filtres nus y ramènerait
 * tout le catalogue.
 */
export type CatalogListProps = {
	/** Taille de page de la requête serveur. */
	perPage: number;
	/** Terme recherché, déjà borné à `TEXT_LIMITS.SEARCH`. */
	searchTerm?: string;
	sortBy?: SortField;
	filters?: ProductFilters;
	/** `filters.onSale` — la grille préfère alors les visuels de promotion. */
	preferOnSale?: boolean;
};

/** Type filtré par le PATH, sur `/produits/[productTypeSlug]`. */
export type ActiveProductType = {
	slug: string;
	label: string;
	description?: string | null;
};

/** Fil d'Ariane VISUEL du catalogue (aucun JSON-LD, cf. `BreadcrumbNav`). */
export type CatalogBreadcrumb = {
	label: string;
	href: string;
};
