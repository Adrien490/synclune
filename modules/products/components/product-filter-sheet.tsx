"use client";

import { FilterSheetWrapper } from "@/shared/components/filter-sheet-wrapper";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { useAppForm } from "@/shared/components/forms";
import { useMediaQuery } from "@/shared/hooks/use-media-query";
import { mediaAtLeast } from "@/shared/constants/breakpoints";
import { useStore } from "@tanstack/react-form";
import { withViewTransition } from "@/shared/utils/view-transition";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
	use,
	useEffect,
	useEffectEvent,
	useRef,
	useTransition,
	Suspense,
	type ComponentProps,
} from "react";
import { PRODUCT_FILTER_DIALOG_ID } from "@/modules/products/constants/product.constants";
import { ProductFilterCompartments } from "./product-filter-compartments";
import { useLiveFilterCount } from "@/modules/products/hooks/use-live-filter-count";
import {
	parseFilterValuesFromURL,
	buildFilterURL,
	buildClearFiltersURL,
	emptyStateHint,
	getDefaultFilterValues,
	getSectionActiveCount,
	isProductCategoryPage,
	getCategorySlugFromPath,
	resetFilterGroup,
	type FilterFormData,
	type FilterSectionId,
} from "@/modules/products/services/product-filter-params.service";

import type { GetColorsReturn } from "@/modules/colors/data/get-colors";
import type { MaterialOption } from "@/modules/materials/data/get-material-options";
import type { ProductTypeOption } from "./filter-section-types";
import type { LiveFilterCount } from "@/modules/products/hooks/use-live-filter-count";
import type { SortOption } from "@/shared/types/sort.types";

// ============================================================================
// CONSTANTS
// ============================================================================

const EMPTY_COLORS: GetColorsReturn["colors"] = [];
const EMPTY_MATERIALS: MaterialOption[] = [];
const EMPTY_PRODUCT_TYPES: ProductTypeOption[] = [];

/** Ancre de la grille produits : scroll smooth au lieu de window.scrollTo(0). */
const PRODUCTS_GRID_ANCHOR_ID = "product-container";

// ============================================================================
// TYPES
// ============================================================================

interface FilterSheetProps {
	colors: GetColorsReturn["colors"];
	materials: MaterialOption[];
	productTypes?: ProductTypeOption[];
	/** Options du compartiment « Trier par » (SSOT `PRODUCTS_SORT_OPTIONS`). */
	sortOptions: SortOption[];
	maxPriceInEuros: number;
	/** Type de produit actif (depuis le path segment /produits/[type]) */
	activeProductTypeSlug?: string;
	/**
	 * Catalogue courant, pour semer le compteur vivant avec un chiffre que le
	 * serveur a DÉJÀ calculé (cf. `initialCount` de `useLiveFilterCount`).
	 * Optionnelle : sans elle, comportement inchangé (un aller-retour à l'ouverture).
	 */
	initialCountPromise?: Promise<{ totalCount: number }>;
}

// ============================================================================
// HELPERS
// ============================================================================

/** Scroll vers la grid produits si l'ancre existe, fallback top sinon. */
function scrollToProductsGrid() {
	if (typeof window === "undefined") return;
	const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches
		? ("auto" as const)
		: ("smooth" as const);
	const anchor = document.getElementById(PRODUCTS_GRID_ANCHOR_ID);
	if (anchor) {
		anchor.scrollIntoView({ behavior, block: "start" });
	} else {
		window.scrollTo({ top: 0, behavior });
	}
}

/**
 * Libellé du bouton d'application — le compte est connu AVANT de fermer.
 *
 * ⚠️ Le bouton est la source UNIQUE du chiffre : il n'annonce un nombre que
 * lorsque ce nombre répond aux critères courants. Sur un échec de recomptage
 * (`countUnavailable`), il retombe sur le libellé neutre plutôt que de promettre
 * un total calculé pour d'autres critères.
 */
function applyButtonLabel(live: LiveFilterCount): string {
	if (live.count === null || live.countUnavailable) return "Voir les pièces";
	if (live.count === 0) return "Aucune pièce";
	if (live.count === 1) return "Voir la pièce";
	return `Voir les ${live.count} pièces`;
}

/*
 * La ligne d'information du footer (sortie de l'état vide) vit désormais dans
 * `emptyStateHint` (couche services) : le pied du rail (« Le comptoir ») rend
 * la même copie, et deux copies locales auraient dérivé. Historique conservé
 * là-bas : le recalcul en vol ne s'y écrit pas — il est porté par le `Spinner`
 * du bouton (`applyBusy`), au même endroit que le nombre.
 */

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Filtre produit : coquille responsive (`FilterSheetWrapper`) + les 5
 * compartiments non repliables du « trieur » sur un écran unique.
 *
 * Plus d'accordéon : tout est visible, ce sont les LISTES qui se bornent
 * (6 entrées + « + N autres », cf. `FilterOverflowList`). Le formulaire
 * TanStack est appliqué en bloc via le bouton du footer — dont le libellé
 * « Voir les N pièces » est alimenté par un compteur vivant serveur
 * (`useLiveFilterCount`), si bien que le résultat est connu avant de fermer.
 */
function ProductFilterSheetInner({
	colors = EMPTY_COLORS,
	materials = EMPTY_MATERIALS,
	productTypes = EMPTY_PRODUCT_TYPES,
	sortOptions,
	maxPriceInEuros,
	activeProductTypeSlug,
	initialCountPromise,
}: FilterSheetProps) {
	const { isOpen, open, close } = useDialog(PRODUCT_FILTER_DIALOG_ID);

	// Focus restoration (WCAG 2.4.3) — capture activeElement avant que le sheet
	// ne vole le focus, puis restaure sur close via rAF (attend que Vaul ait
	// fini son animation, et preventScroll évite un jump iOS).
	const previousFocusRef = useRef<HTMLElement | null>(null);

	const DEFAULT_PRICE_RANGE: [number, number] = [0, maxPriceInEuros];
	const pathname = usePathname();
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();

	const getValuesFromURL = (): FilterFormData =>
		parseFilterValuesFromURL({
			searchParams,
			activeProductTypeSlug,
			defaultPriceRange: DEFAULT_PRICE_RANGE,
		});

	const initialValues = getValuesFromURL();

	const form = useAppForm({
		defaultValues: initialValues,
		onSubmit: async ({ value }: { value: FilterFormData }) => {
			applyFilters(value);
		},
	});

	// `useStore` et non `form.Subscribe` : le compteur vivant est un hook, et un
	// hook ne peut pas vivre dans le children d'un render-prop.
	const values = useStore(form.store, (state) => state.values);

	const isDesktop = useMediaQuery(mediaAtLeast("lg"));

	const searchTerm = searchParams.get("search") ?? undefined;
	// Le compte des valeurs INITIALES est déjà connu du serveur — la grille vient
	// de le rendre. Le semer évite une Server Action (et un réveil Neon) à chaque
	// ouverture du panneau pour un chiffre qu'on avait déjà.
	//
	// ⚠️ `use()` et non `await` chez l'appelant : awaiter la promesse dans
	// `ProductCatalog` ferait attendre le shell, ce que la frontière `Suspense` de
	// `CatalogHeading` existe précisément pour éviter. Ici le panneau est fermé au
	// montage, donc suspendre ne coûte rien de visible.
	const initialCount = initialCountPromise ? use(initialCountPromise).totalCount : null;

	const liveCount = useLiveFilterCount({
		values,
		maxPriceInEuros,
		search: searchTerm,
		enabled: isOpen,
		initialCount,
	});

	// Effect Event: resync formulaire sans re-déclencher l'effet.
	const onSheetSync = useEffectEvent(() => {
		form.reset(getValuesFromURL());
	});

	useEffect(() => {
		if (isOpen) {
			onSheetSync();
		}
	}, [isOpen, searchParams]);

	const isOnCategoryPage = isProductCategoryPage(pathname);
	const currentCategorySlug = getCategorySlugFromPath(pathname);

	const handleOpenChange = (nextOpen: boolean) => {
		if (nextOpen) {
			previousFocusRef.current = document.activeElement as HTMLElement | null;
			open();
		} else {
			close();
			requestAnimationFrame(() => previousFocusRef.current?.focus({ preventScroll: true }));
		}
	};

	const applyFilters = (formData: FilterFormData) => {
		const { fullUrl } = buildFilterURL({
			formData,
			currentSearchParams: searchParams,
			defaultPriceRange: DEFAULT_PRICE_RANGE,
			isOnCategoryPage,
			currentCategorySlug,
		});

		startTransition(() => {
			withViewTransition(() => router.push(fullUrl));
			scrollToProductsGrid();
		});
	};

	const clearAllFilters = () => {
		form.reset(getDefaultFilterValues(DEFAULT_PRICE_RANGE));

		const fullUrl = buildClearFiltersURL(searchParams);

		startTransition(() => {
			withViewTransition(() => router.push(fullUrl));
			scrollToProductsGrid();
		});
	};

	/** Bascule un slug dans une sélection multi-valeurs. */
	const toggleToken = (
		name: "productTypes" | "colors" | "materials",
		slug: string,
		checked: boolean,
	) => {
		const current = form.state.values[name];
		form.setFieldValue(name, checked ? [...current, slug] : current.filter((s) => s !== slug));
	};

	/** Réinitialise un compartiment à sa valeur par défaut. */
	const handleSectionReset = (section: FilterSectionId) => {
		const next = resetFilterGroup(form.state.values, section, DEFAULT_PRICE_RANGE);
		form.setFieldValue("productTypes", next.productTypes);
		form.setFieldValue("colors", next.colors);
		form.setFieldValue("materials", next.materials);
		form.setFieldValue("priceRange", next.priceRange);
		form.setFieldValue("inStockOnly", next.inStockOnly);
		form.setFieldValue("onSale", next.onSale);
	};

	const counts = getSectionActiveCount(values, DEFAULT_PRICE_RANGE);
	const pendingFilterCount = Object.values(counts).reduce((sum, n) => sum + n, 0);

	// À partir de `lg`, le filtre EST le rail (« Le plan de travail ») : le
	// panneau n'a plus lieu d'être. Démonté après les hooks, jamais avant — et
	// sans flash : au SSR la sheet est rendue fermée, donc invisible.
	if (isDesktop) return null;

	return (
		<FilterSheetWrapper
			open={isOpen}
			onOpenChange={handleOpenChange}
			hideTrigger
			activeFiltersCount={pendingFilterCount}
			hasActiveFilters={pendingFilterCount > 0}
			onApply={() => void form.handleSubmit()}
			onClearAll={clearAllFilters}
			isPending={isPending}
			title="Filtres"
			description="Affine ta recherche"
			applyButtonText={applyButtonLabel(liveCount)}
			footerHint={emptyStateHint(liveCount)}
			// Ne barre le passage que sur un zéro CERTAIN : un recomptage en vol ou
			// indisponible (rate limit) laisse le bouton actif — mieux vaut appliquer
			// et voir la grille que bloquer sur un chiffre qu'on n'a pas.
			applyDisabled={!liveCount.isUpdating && !liveCount.countUnavailable && liveCount.count === 0}
			applyBusy={liveCount.isUpdating}
		>
			<ProductFilterCompartments
				host="sheet"
				productTypes={productTypes}
				colors={colors}
				materials={materials}
				maxPriceInEuros={maxPriceInEuros}
				values={values}
				counts={counts}
				onToggle={toggleToken}
				onPriceChange={(value) => form.setFieldValue("priceRange", value)}
				onAvailabilityChange={(field, checked) => form.setFieldValue(field, checked)}
				onSectionReset={handleSectionReset}
				sortOptions={sortOptions}
				// Comme les filtres : le tri choisi est EN ATTENTE jusqu'à « Voir les
				// N pièces » — une navigation immédiate ferait resync le formulaire
				// (effet `[isOpen, searchParams]`) et perdrait les coches en attente.
				onSortChange={(value) => form.setFieldValue("sortBy", value)}
			/>

			{/* Live region : annonce le nombre de filtres en attente à chaque
			    changement du formulaire (toggle, reset). */}
			<div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
				{pendingFilterCount === 0
					? "Aucun filtre sélectionné"
					: `${pendingFilterCount} filtre${pendingFilterCount > 1 ? "s" : ""} sélectionné${pendingFilterCount > 1 ? "s" : ""}`}
			</div>
		</FilterSheetWrapper>
	);
}

export function ProductFilterSheet(props: ComponentProps<typeof ProductFilterSheetInner>) {
	return (
		<Suspense fallback={null}>
			<ProductFilterSheetInner {...props} />
		</Suspense>
	);
}
