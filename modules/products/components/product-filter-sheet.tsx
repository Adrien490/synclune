"use client";

import { FilterSheetWrapper } from "@/shared/components/filter-sheet-wrapper";
import { Accordion } from "@/shared/components/ui/accordion";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { useAppForm } from "@/shared/components/forms";
import { withViewTransition } from "@/shared/utils/view-transition";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
	useDeferredValue,
	useEffect,
	useEffectEvent,
	useRef,
	useState,
	useTransition,
	Suspense,
	type ComponentProps,
} from "react";
import { PRODUCT_FILTER_DIALOG_ID } from "@/modules/products/constants/product.constants";
import { PriceRangeInputs } from "./price-range-inputs";
import { FilterSection } from "./filter-section-header";
import { TypeFilterSection } from "./filter-section-types";
import { ColorFilterSection } from "./filter-section-colors";
import { MaterialFilterSection } from "./filter-section-materials";
import { RatingFilterSection } from "./filter-section-rating";
import { AvailabilityFilterSection } from "./filter-section-availability";
import {
	parseFilterValuesFromURL,
	buildFilterURL,
	buildClearFiltersURL,
	getDefaultFilterValues,
	getSectionActiveCount,
	isProductCategoryPage,
	getCategorySlugFromPath,
	type FilterFormData,
} from "@/modules/products/services/product-filter-params.service";

import type { GetColorsReturn } from "@/modules/colors/data/get-colors";
import type { MaterialOption } from "@/modules/materials/data/get-material-options";
import type { ProductTypeOption } from "./filter-section-types";

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
	maxPriceInEuros: number;
	/** Type de produit actif (depuis le path segment /produits/[type]) */
	activeProductTypeSlug?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

/** Scroll vers la grid produits si l'ancre existe, fallback top sinon. */
function scrollToProductsGrid() {
	if (typeof window === "undefined") return;
	const anchor = document.getElementById(PRODUCTS_GRID_ANCHOR_ID);
	if (anchor) {
		anchor.scrollIntoView({ behavior: "smooth", block: "start" });
	} else {
		window.scrollTo({ top: 0, behavior: "smooth" });
	}
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Filtre produit : coquille responsive (`FilterSheetWrapper`) + accordéon de
 * sections sur un écran unique.
 *
 * Toutes les catégories sont visibles d'un coup d'œil ; chacune se déplie sur
 * place. Le formulaire TanStack est appliqué en bloc via le bouton
 * « Appliquer » du footer (ou ⌘/Ctrl+Entrée).
 */
function ProductFilterSheetInner({
	colors = EMPTY_COLORS,
	materials = EMPTY_MATERIALS,
	productTypes = EMPTY_PRODUCT_TYPES,
	maxPriceInEuros,
	activeProductTypeSlug,
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

	// Search state for long lists
	const [colorSearch, setColorSearch] = useState("");
	const [materialSearch, setMaterialSearch] = useState("");

	// Defer search values to avoid jank on slow devices
	const deferredColorSearch = useDeferredValue(colorSearch);
	const deferredMaterialSearch = useDeferredValue(materialSearch);

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

	// Effect Event: resync formulaire + recherche sans re-déclencher l'effet.
	const onSheetSync = useEffectEvent(() => {
		form.reset(getValuesFromURL());
		setColorSearch("");
		setMaterialSearch("");
	});

	useEffect(() => {
		if (isOpen) {
			// eslint-disable-next-line react-hooks/set-state-in-effect
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
		current: string[],
		slug: string,
		checked: boolean,
	) => {
		form.setFieldValue(name, checked ? [...current, slug] : current.filter((s) => s !== slug));
	};

	// Sections ouvertes par défaut : types + prix + toute section avec un filtre
	// actif au montage. Lazy init pour garder le tableau stable.
	const [defaultOpenSections] = useState<string[]>(() => {
		const sections = ["types", "price"];
		if (initialValues.colors.length > 0) sections.push("colors");
		if (initialValues.materials.length > 0) sections.push("materials");
		if (initialValues.ratingMin !== null) sections.push("rating");
		if (initialValues.inStockOnly || initialValues.onSale) sections.push("availability");
		return sections;
	});

	// Sort colors / materials / types by count (descending)
	const sortedColors = colors.toSorted((a, b) => b._count.skus - a._count.skus);
	const sortedMaterials = materials.toSorted(
		(a, b) => (b._count?.skus ?? 0) - (a._count?.skus ?? 0),
	);
	const sortedProductTypes = productTypes.toSorted(
		(a, b) => (b._count?.products ?? 0) - (a._count?.products ?? 0),
	);

	// Filter lists by deferred search term
	const filteredColors = deferredColorSearch
		? sortedColors.filter((c) => c.name.toLowerCase().includes(deferredColorSearch.toLowerCase()))
		: sortedColors;
	const filteredMaterials = deferredMaterialSearch
		? sortedMaterials.filter((m) =>
				m.name.toLowerCase().includes(deferredMaterialSearch.toLowerCase()),
			)
		: sortedMaterials;

	// `form.Subscribe` garantit le re-render du sheet (badges + total
	// `pendingFilterCount`) à chaque mutation du formulaire.
	return (
		<form.Subscribe selector={(state) => state.values}>
			{(values) => {
				const counts = getSectionActiveCount(values, DEFAULT_PRICE_RANGE);
				const pendingFilterCount = Object.values(counts).reduce((sum, n) => sum + n, 0);

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
						description="Affinez votre recherche"
					>
						<Accordion type="multiple" defaultValue={defaultOpenSections} className="w-full">
							{/* 1. Types de bijoux (masqué si aucun type) */}
							{sortedProductTypes.length > 0 && (
								<FilterSection
									value="types"
									label="Types de bijoux"
									count={counts.types}
									onReset={() => form.setFieldValue("productTypes", [])}
								>
									<TypeFilterSection
										productTypes={sortedProductTypes}
										selectedValues={values.productTypes}
										onToggle={(slug, checked) =>
											toggleToken("productTypes", values.productTypes, slug, checked)
										}
									/>
								</FilterSection>
							)}

							{/* 2. Prix (toujours visible) */}
							<FilterSection
								value="price"
								label="Prix"
								count={counts.price}
								badgeContent={
									counts.price > 0
										? `${values.priceRange[0]}€ - ${values.priceRange[1]}€`
										: undefined
								}
								onReset={() => form.setFieldValue("priceRange", DEFAULT_PRICE_RANGE)}
							>
								<PriceRangeInputs
									value={values.priceRange}
									onChange={(value) => form.setFieldValue("priceRange", value)}
									maxPrice={maxPriceInEuros}
								/>
							</FilterSection>

							{/* 3. Couleurs (masqué si aucune couleur) */}
							{sortedColors.length > 0 && (
								<FilterSection
									value="colors"
									label="Couleurs"
									count={counts.colors}
									onReset={() => form.setFieldValue("colors", [])}
								>
									<ColorFilterSection
										colors={sortedColors}
										filteredColors={filteredColors}
										selectedValues={values.colors}
										colorSearch={colorSearch}
										onColorSearchChange={setColorSearch}
										onToggle={(slug, checked) =>
											toggleToken("colors", values.colors, slug, checked)
										}
									/>
								</FilterSection>
							)}

							{/* 4. Matériaux (masqué si aucun matériau) */}
							{sortedMaterials.length > 0 && (
								<FilterSection
									value="materials"
									label="Matériaux"
									count={counts.materials}
									onReset={() => form.setFieldValue("materials", [])}
								>
									<MaterialFilterSection
										materials={sortedMaterials}
										filteredMaterials={filteredMaterials}
										selectedValues={values.materials}
										materialSearch={materialSearch}
										onMaterialSearchChange={setMaterialSearch}
										onToggle={(slug, checked) =>
											toggleToken("materials", values.materials, slug, checked)
										}
									/>
								</FilterSection>
							)}

							{/* 5. Notes clients (toujours visible) */}
							<FilterSection
								value="rating"
								label="Notes clients"
								count={counts.rating}
								badgeContent={values.ratingMin !== null ? `${values.ratingMin}+ ★` : undefined}
								onReset={() => form.setFieldValue("ratingMin", null)}
							>
								<RatingFilterSection
									selectedValue={values.ratingMin}
									onChange={(value) => form.setFieldValue("ratingMin", value)}
								/>
							</FilterSection>

							{/* 6. Disponibilité (toujours visible) */}
							<FilterSection
								value="availability"
								label="Disponibilité"
								count={counts.availability}
								onReset={() => {
									form.setFieldValue("inStockOnly", false);
									form.setFieldValue("onSale", false);
								}}
								className="border-b-0"
							>
								<AvailabilityFilterSection
									inStockOnly={values.inStockOnly}
									onSale={values.onSale}
									onInStockChange={(checked) => form.setFieldValue("inStockOnly", checked)}
									onSaleChange={(checked) => form.setFieldValue("onSale", checked)}
								/>
							</FilterSection>
						</Accordion>

						{/* Live region : annonce le nombre de filtres en attente à chaque
						    changement du formulaire (toggle, reset). */}
						<div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
							{pendingFilterCount === 0
								? "Aucun filtre sélectionné"
								: `${pendingFilterCount} filtre${pendingFilterCount > 1 ? "s" : ""} sélectionné${pendingFilterCount > 1 ? "s" : ""}`}
						</div>
					</FilterSheetWrapper>
				);
			}}
		</form.Subscribe>
	);
}

export function ProductFilterSheet(props: ComponentProps<typeof ProductFilterSheetInner>) {
	return (
		<Suspense fallback={null}>
			<ProductFilterSheetInner {...props} />
		</Suspense>
	);
}
