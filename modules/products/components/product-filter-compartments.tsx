"use client";

import { FILTER_SECTION_ACCENTS } from "./catalog-accents.constants";
import { FilterCompartment } from "./filter-compartment";
import { PriceRangeInputs } from "./price-range-inputs";
import { TypeFilterSection, type ProductTypeOption } from "./filter-section-types";
import { ColorFilterSection } from "./filter-section-colors";
import { MaterialFilterSection } from "./filter-section-materials";
import { AvailabilityFilterSection } from "./filter-section-availability";
import { SortFilterSection } from "./filter-section-sort";
import {
	PRODUCTS_DEFAULT_SORT,
	PRODUCTS_SORT_LABELS,
} from "@/modules/products/constants/product.constants";

import type { GetColorsReturn } from "@/modules/colors/data/get-colors";
import type { MaterialOption } from "@/modules/materials/data/get-material-options";
import type {
	FilterFormData,
	FilterSectionId,
} from "@/modules/products/services/product-filter-params.service";
import type { SortOption } from "@/shared/types/sort.types";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Hôte de rendu du corps de filtres. Deux hôtes coexistent DANS LE MÊME
 * DOCUMENT — le rail est `hidden lg:block`, donc présent à tous les viewports —
 * et deux propriétés du corps en dépendent : la portée des `id` et la gouttière
 * de l'en-tête collant. Les deux vivent ici pour qu'un troisième hôte ne puisse
 * pas en oublier une.
 */
export type FilterHost = "sheet" | "rail";

/**
 * Gouttière horizontale de l'hôte : elle DOIT valoir le padding horizontal du
 * conteneur de défilement de l'hôte.
 *
 * Tout le corps de filtres déborde en négatif pour que ses fonds (survol d'une
 * ligne, bande d'en-tête collante) atteignent les bords de l'hôte :
 * `-mx-6` pour l'en-tête d'un compartiment, `-mx-3` pour chaque ligne de filtre
 * (`CheckboxFilterItem`, lignes de disponibilité) et `w-[calc(100%+1.5rem)]`
 * pour le bouton de dépli. Ces débords n'ont où aller que si l'hôte ouvre au
 * moins autant de padding.
 *
 * ⚠️ **Un hôte sans padding fait déborder le corps, pas l'inverse.** Le rail a
 * d'abord été posé à `0px` : la bande d'en-tête dépassait sa colonne de 16 rem
 * de 24 px, et les lignes de 12 px. Comme le rail est `overflow-y-auto`, CSS
 * promeut `overflow-x` de `visible` à `auto` — la colonne devenait scrollable
 * horizontalement (mesuré : `scrollWidth` 268 pour 256 de large). Le rail ouvre
 * donc `px-3`, et cette table doit rester d'accord avec lui.
 */
export const HOST_GUTTER: Record<FilterHost, string> = {
	/** `px-6` du conteneur de défilement de `FilterSheetWrapper`. */
	sheet: "1.5rem",
	/** `px-3` du conteneur de défilement de `ProductFilterRail`. */
	rail: "0.75rem",
};

export interface ProductFilterCompartmentsProps {
	/**
	 * Hôte de rendu — **requis**, sans valeur par défaut. Il borne les `id` DOM
	 * (`sheet-type-bagues` / `rail-type-bagues`) : les deux hôtes émettaient les
	 * mêmes, et comme `CheckboxFilterItem` est un `<label htmlFor>`, la spec HTML
	 * résolvait chaque label du panneau vers le contrôle CACHÉ du rail (premier
	 * dans l'ordre du document). Taper le texte d'une ligne au mobile ne cochait
	 * donc rien et déclenchait la navigation immédiate du rail.
	 */
	host: FilterHost;
	productTypes: ProductTypeOption[];
	colors: GetColorsReturn["colors"];
	materials: MaterialOption[];
	maxPriceInEuros: number;
	/** Valeurs courantes — en attente (Sheet) ou optimistes (rail). */
	values: FilterFormData;
	/** Compteur actif par section (`getSectionActiveCount`). */
	counts: Record<FilterSectionId, number>;
	onToggle: (
		group: "productTypes" | "colors" | "materials",
		slug: string,
		checked: boolean,
	) => void;
	/**
	 * Intention de coche (survol / focus), AVANT le clic — câblée au seul
	 * compartiment « Types de bijoux », qui est le seul à changer de path.
	 * Fournie par l'hôte qui applique à la coche (le rail) ; le panneau mobile
	 * n'applique qu'au bouton, il n'a rien à précharger d'avance.
	 */
	onTypeIntent?: (slug: string, checked: boolean) => void;
	onPriceChange: (value: [number, number]) => void;
	/**
	 * Commit du prix au relâchement seulement — pour un hôte qui applique à la
	 * coche (le rail). Le panneau, lui, applique en bloc et n'en a pas besoin.
	 */
	onPriceCommit?: (value: [number, number]) => void;
	onAvailabilityChange: (field: "inStockOnly" | "onSale", checked: boolean) => void;
	onSectionReset: (section: FilterSectionId) => void;
	/**
	 * Options du compartiment « Trier par » (SSOT `PRODUCTS_SORT_OPTIONS`).
	 * Le tri n'est PAS un filtre : il ne passe ni par `counts` ni par
	 * `onSectionReset` — son badge et son reset sont dérivés ici de
	 * `values.sortBy`, et il ne compte dans aucun total de filtres actifs.
	 */
	sortOptions: SortOption[];
	onSortChange: (value: string) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Les 5 compartiments du filtre produit (« Le trieur ») — 100 % contrôlé,
 * sans état d'application : le HÔTE décide du mode.
 *
 * - Sheet (< lg) : piloté par le form TanStack, application différée via
 *   « Voir les N pièces » ;
 * - Rail (≥ lg) : piloté par l'URL + optimiste, application immédiate.
 *
 * Le tri par nombre de pièces vit ICI (et non chez les hôtes) : les 6 entrées
 * visibles des listes bornées doivent être les mieux fournies partout.
 */
export function ProductFilterCompartments({
	host,
	productTypes,
	colors,
	materials,
	maxPriceInEuros,
	values,
	counts,
	onToggle,
	onTypeIntent,
	onPriceChange,
	onPriceCommit,
	onAvailabilityChange,
	onSectionReset,
	sortOptions,
	onSortChange,
}: ProductFilterCompartmentsProps) {
	const activeSortLabel = (PRODUCTS_SORT_LABELS as Partial<Record<string, string>>)[values.sortBy];
	const isSortActive = values.sortBy !== PRODUCTS_DEFAULT_SORT;

	const sortedProductTypes = productTypes.toSorted(
		(a, b) => (b._count?.products ?? 0) - (a._count?.products ?? 0),
	);
	const sortedColors = colors.toSorted((a, b) => b._count.skus - a._count.skus);
	const sortedMaterials = materials.toSorted(
		(a, b) => (b._count?.skus ?? 0) - (a._count?.skus ?? 0),
	);

	return (
		<div
			className="space-y-7"
			// Ancre du contrat de portée des `id` : `filter-dual-mount-id-scope`
			// vérifie que chaque `<label htmlFor>` cible un contrôle du MÊME hôte.
			data-filter-host={host}
			// Consommée par l'en-tête collant de chaque `FilterCompartment`.
			style={{ "--filter-gutter": HOST_GUTTER[host] } as React.CSSProperties}
		>
			{/*
			 * « Trier par » ouvre le meuble (retrait de la barre d'outils, 2026-08-06) :
			 * c'est le seul réglage qui s'applique à TOUTE la grille, il précède les
			 * critères qui la restreignent. Badge = libellé du tri actif (comme le
			 * prix affiche sa plage), reset = retour au tri par défaut — dérivés de
			 * `values.sortBy`, hors du circuit `counts`/`onSectionReset` (le tri
			 * n'est pas un filtre).
			 */}
			<FilterCompartment
				host={host}
				id="sort"
				label="Trier par"
				count={isSortActive ? 1 : 0}
				badgeContent={isSortActive ? activeSortLabel : undefined}
				accent="bg-border"
				onReset={() => onSortChange(PRODUCTS_DEFAULT_SORT)}
			>
				<SortFilterSection
					idPrefix={host}
					options={sortOptions}
					value={values.sortBy}
					onChange={onSortChange}
				/>
			</FilterCompartment>

			{sortedProductTypes.length > 0 && (
				<FilterCompartment
					host={host}
					id="types"
					label="Types de bijoux"
					count={counts.types}
					accent={FILTER_SECTION_ACCENTS.types}
					onReset={() => onSectionReset("types")}
				>
					<TypeFilterSection
						idPrefix={host}
						productTypes={sortedProductTypes}
						selectedValues={values.productTypes}
						onToggle={(slug, checked) => onToggle("productTypes", slug, checked)}
						onIntent={onTypeIntent}
					/>
				</FilterCompartment>
			)}

			<FilterCompartment
				host={host}
				id="price"
				label="Prix"
				count={counts.price}
				badgeContent={
					counts.price > 0 ? `${values.priceRange[0]}€ - ${values.priceRange[1]}€` : undefined
				}
				accent={FILTER_SECTION_ACCENTS.price}
				onReset={() => onSectionReset("price")}
			>
				<PriceRangeInputs
					idPrefix={host}
					value={values.priceRange}
					onChange={onPriceChange}
					onCommit={onPriceCommit}
					maxPrice={maxPriceInEuros}
				/>
			</FilterCompartment>

			{sortedColors.length > 0 && (
				<FilterCompartment
					host={host}
					id="colors"
					label="Couleurs"
					count={counts.colors}
					accent={FILTER_SECTION_ACCENTS.colors}
					onReset={() => onSectionReset("colors")}
				>
					<ColorFilterSection
						idPrefix={host}
						colors={sortedColors}
						selectedValues={values.colors}
						onToggle={(slug, checked) => onToggle("colors", slug, checked)}
					/>
				</FilterCompartment>
			)}

			{sortedMaterials.length > 0 && (
				<FilterCompartment
					host={host}
					id="materials"
					label="Matériaux"
					count={counts.materials}
					accent={FILTER_SECTION_ACCENTS.materials}
					onReset={() => onSectionReset("materials")}
				>
					<MaterialFilterSection
						idPrefix={host}
						materials={sortedMaterials}
						selectedValues={values.materials}
						onToggle={(slug, checked) => onToggle("materials", slug, checked)}
					/>
				</FilterCompartment>
			)}

			<FilterCompartment
				host={host}
				id="availability"
				label="Disponibilité"
				count={counts.availability}
				accent={FILTER_SECTION_ACCENTS.availability}
				onReset={() => onSectionReset("availability")}
			>
				<AvailabilityFilterSection
					idPrefix={host}
					inStockOnly={values.inStockOnly}
					onSale={values.onSale}
					onInStockChange={(checked) => onAvailabilityChange("inStockOnly", checked)}
					onSaleChange={(checked) => onAvailabilityChange("onSale", checked)}
				/>
			</FilterCompartment>
		</div>
	);
}
