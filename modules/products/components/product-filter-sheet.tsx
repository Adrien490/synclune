"use client";

import { FilterSheetWrapper } from "@/shared/components/filter-sheet-wrapper";
import { Accordion } from "@/shared/components/ui/accordion";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { useAppForm } from "@/shared/components/forms";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { withViewTransition } from "@/shared/utils/view-transition";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
	useDeferredValue,
	useEffect,
	useEffectEvent,
	useRef,
	useState,
	useTransition,
} from "react";
import { PRODUCT_FILTER_DIALOG_ID } from "@/modules/products/constants/product.constants";
import { PriceRangeInputs } from "./price-range-inputs";
import { SectionHeader } from "./filter-section-header";
import { TypeFilterSection } from "./filter-section-types";
import { ColorFilterSection } from "./filter-section-colors";
import { MaterialFilterSection } from "./filter-section-materials";
import { RatingFilterSection } from "./filter-section-rating";
import { AvailabilityFilterSection } from "./filter-section-availability";
import { FilterActiveChips, type FilterChipDescriptor } from "./filter-active-chips";
import {
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/shared/components/ui/accordion";
import {
	parseFilterValuesFromURL,
	buildFilterURL,
	buildClearFiltersURL,
	countActiveFilters,
	getDefaultFilterValues,
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

/** Ordre stable des sections Accordion pour retrouver l'item DOM via index. */
const SECTION_ORDER = ["types", "price", "colors", "materials", "rating", "availability"] as const;
type SectionValue = (typeof SECTION_ORDER)[number];

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

export function ProductFilterSheet({
	colors = EMPTY_COLORS,
	materials = EMPTY_MATERIALS,
	productTypes = EMPTY_PRODUCT_TYPES,
	maxPriceInEuros,
	activeProductTypeSlug,
}: FilterSheetProps) {
	const { isOpen, open, close } = useDialog(PRODUCT_FILTER_DIALOG_ID);
	const isMobile = useIsMobile();

	// Focus restoration (WCAG 2.4.3) — capture activeElement avant que le sheet
	// ne vole le focus, puis restaure sur close via rAF (attend que Vaul ait
	// fini son animation avant le focus, et preventScroll évite un jump iOS).
	const previousFocusRef = useRef<HTMLElement | null>(null);

	// Ref sur la racine Accordion pour focus le premier input d'une section
	// déroulée manuellement (desktop uniquement — évite d'ouvrir le clavier
	// soft iOS/Android lors du tap).
	const accordionRef = useRef<HTMLDivElement>(null);

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

	const getValuesFromURL = (): FilterFormData => {
		return parseFilterValuesFromURL({
			searchParams,
			activeProductTypeSlug,
			defaultPriceRange: DEFAULT_PRICE_RANGE,
		});
	};

	const initialValues = getValuesFromURL();

	const form = useAppForm({
		defaultValues: initialValues,
		onSubmit: async ({ value }: { value: FilterFormData }) => {
			applyFilters(value);
		},
	});

	// Effect Event: reads form, getValuesFromURL, setColorSearch, setMaterialSearch
	// without re-triggering the sync effect
	const onSheetSync = useEffectEvent(() => {
		const values = getValuesFromURL();
		form.reset(values);
		setColorSearch("");
		setMaterialSearch("");
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

	// P1.4 — Quand une section Accordion est dépliée manuellement (desktop),
	// focus le premier input interactif pour accélérer la navigation clavier.
	// Skip sur mobile : éviter d'ouvrir le clavier soft au tap d'une section.
	const handleAccordionValueChange = (values: string[]) => {
		const prev = previousOpenSectionsRef.current;
		previousOpenSectionsRef.current = values;
		if (isMobile) return;
		const newlyOpened = values.find(
			(v) => !prev.includes(v) && SECTION_ORDER.includes(v as SectionValue),
		) as SectionValue | undefined;
		if (!newlyOpened) return;
		const index = SECTION_ORDER.indexOf(newlyOpened);
		if (index < 0 || !accordionRef.current) return;
		requestAnimationFrame(() => {
			const item = accordionRef.current?.children[index] as HTMLElement | undefined;
			if (!item) return;
			const focusable = item.querySelector<HTMLElement>(
				'input:not([type="hidden"]):not([disabled]), [role="slider"]:not([disabled])',
			);
			focusable?.focus({ preventScroll: true });
		});
	};

	const { hasActiveFilters, activeFiltersCount } = countActiveFilters(searchParams);

	// Sort colors and materials by count (descending)
	const sortedColors = [...colors].sort((a, b) => b._count.skus - a._count.skus);
	const sortedMaterials = [...materials].sort(
		(a, b) => (b._count?.skus ?? 0) - (a._count?.skus ?? 0),
	);
	const sortedProductTypes = [...productTypes].sort(
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

	// Default open sections: types + price + any section with active filters.
	// Lazy-initialized to keep the array stable across re-renders and to allow
	// the ref below to snapshot it at mount without accessing refs during render.
	const [defaultOpenSections] = useState<string[]>(() => {
		const sections = ["types", "price"];
		if (initialValues.colors.length > 0) sections.push("colors");
		if (initialValues.materials.length > 0) sections.push("materials");
		if (initialValues.ratingMin !== null) sections.push("rating");
		if (initialValues.inStockOnly || initialValues.onSale) sections.push("availability");
		return sections;
	});
	const previousOpenSectionsRef = useRef<string[]>(defaultOpenSections);

	// P2.2 — Compte des filtres actifs dans le formulaire (pas l'URL) pour
	// annoncer les toggles avant Apply. Mis à jour à chaque ajout/retrait via
	// chip ou section.
	const formValues = form.state.values;
	const pendingFilterCount =
		formValues.productTypes.length +
		formValues.colors.length +
		formValues.materials.length +
		(formValues.priceRange[0] !== DEFAULT_PRICE_RANGE[0] ||
		formValues.priceRange[1] !== DEFAULT_PRICE_RANGE[1]
			? 1
			: 0) +
		(formValues.ratingMin !== null ? 1 : 0) +
		(formValues.inStockOnly ? 1 : 0) +
		(formValues.onSale ? 1 : 0);

	// Supprime un filtre individuel via une chip (sans fermer la sheet).
	const handleRemoveChip = (chip: FilterChipDescriptor) => {
		switch (chip.kind) {
			case "type": {
				const current = form.state.values.productTypes;
				form.setFieldValue(
					"productTypes",
					current.filter((s) => s !== chip.slug),
				);
				return;
			}
			case "color": {
				const current = form.state.values.colors;
				form.setFieldValue(
					"colors",
					current.filter((s) => s !== chip.slug),
				);
				return;
			}
			case "material": {
				const current = form.state.values.materials;
				form.setFieldValue(
					"materials",
					current.filter((s) => s !== chip.slug),
				);
				return;
			}
			case "price":
				form.setFieldValue("priceRange", DEFAULT_PRICE_RANGE);
				return;
			case "rating":
				form.setFieldValue("ratingMin", null);
				return;
			case "inStock":
				form.setFieldValue("inStockOnly", false);
				return;
			case "onSale":
				form.setFieldValue("onSale", false);
				return;
		}
	};

	return (
		<FilterSheetWrapper
			open={isOpen}
			onOpenChange={handleOpenChange}
			hideTrigger
			activeFiltersCount={activeFiltersCount}
			hasActiveFilters={hasActiveFilters}
			onApply={() => void form.handleSubmit()}
			onClearAll={clearAllFilters}
			isPending={isPending}
			title="Filtres"
			description="Affinez votre recherche"
		>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					void form.handleSubmit();
				}}
			>
				<FilterActiveChips
					formData={form.state.values}
					colors={sortedColors}
					materials={sortedMaterials}
					productTypes={sortedProductTypes}
					defaultPriceRange={DEFAULT_PRICE_RANGE}
					onRemove={handleRemoveChip}
				/>

				<Accordion
					ref={accordionRef}
					type="multiple"
					defaultValue={defaultOpenSections}
					onValueChange={handleAccordionValueChange}
					className="w-full"
					aria-label="Filtres de recherche"
				>
					{/* 1. Types de bijoux */}
					<form.Field name="productTypes" mode="array">
						{(field) => (
							<TypeFilterSection
								productTypes={sortedProductTypes}
								selectedValues={field.state.value}
								onToggle={(slug, checked) => {
									const isSelected = field.state.value.includes(slug);
									if (checked && !isSelected) {
										field.pushValue(slug);
									} else if (!checked && isSelected) {
										const index = field.state.value.indexOf(slug);
										field.removeValue(index);
									}
								}}
								onReset={() => field.handleChange([])}
							/>
						)}
					</form.Field>

					{/* 2. Prix */}
					<form.Field name="priceRange">
						{(field) => {
							const hasCustomPrice =
								field.state.value[0] !== 0 || field.state.value[1] !== maxPriceInEuros;
							return (
								<AccordionItem value="price">
									<AccordionTrigger headingLevel={3} className="hover:no-underline">
										<SectionHeader
											label="Prix"
											count={hasCustomPrice ? 1 : 0}
											badgeContent={
												hasCustomPrice
													? `${field.state.value[0]}€ - ${field.state.value[1]}€`
													: undefined
											}
											onReset={() => field.handleChange(DEFAULT_PRICE_RANGE)}
										/>
									</AccordionTrigger>
									<AccordionContent>
										<PriceRangeInputs
											value={field.state.value}
											onChange={field.handleChange}
											maxPrice={maxPriceInEuros}
										/>
									</AccordionContent>
								</AccordionItem>
							);
						}}
					</form.Field>

					{/* 3. Couleurs */}
					<form.Field name="colors" mode="array">
						{(field) => (
							<ColorFilterSection
								colors={sortedColors}
								filteredColors={filteredColors}
								selectedValues={field.state.value}
								colorSearch={colorSearch}
								onColorSearchChange={setColorSearch}
								onToggle={(slug, checked) => {
									const isSelected = field.state.value.includes(slug);
									if (checked && !isSelected) {
										field.pushValue(slug);
									} else if (!checked && isSelected) {
										const index = field.state.value.indexOf(slug);
										field.removeValue(index);
									}
								}}
								onReset={() => field.handleChange([])}
							/>
						)}
					</form.Field>

					{/* 4. Materiaux */}
					<form.Field name="materials" mode="array">
						{(field) => (
							<MaterialFilterSection
								materials={sortedMaterials}
								filteredMaterials={filteredMaterials}
								selectedValues={field.state.value}
								materialSearch={materialSearch}
								onMaterialSearchChange={setMaterialSearch}
								onToggle={(slug, checked) => {
									const isSelected = field.state.value.includes(slug);
									if (checked && !isSelected) {
										field.pushValue(slug);
									} else if (!checked && isSelected) {
										const index = field.state.value.indexOf(slug);
										field.removeValue(index);
									}
								}}
								onReset={() => field.handleChange([])}
							/>
						)}
					</form.Field>

					{/* 5. Notes clients */}
					<form.Field name="ratingMin">
						{(field) => (
							<RatingFilterSection
								selectedValue={field.state.value}
								onChange={field.handleChange}
							/>
						)}
					</form.Field>

					{/* 6. Disponibilite */}
					<AvailabilityFilterSection
						inStockOnly={form.state.values.inStockOnly}
						onSale={form.state.values.onSale}
						onInStockChange={(checked) => form.setFieldValue("inStockOnly", checked)}
						onSaleChange={(checked) => form.setFieldValue("onSale", checked)}
						onReset={() => {
							form.setFieldValue("inStockOnly", false);
							form.setFieldValue("onSale", false);
						}}
					/>
				</Accordion>

				{/* P2.2 — Live region : annonce le nombre de filtres en attente à
				    chaque changement du formulaire (chip retirée, toggle, reset). */}
				<div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
					{pendingFilterCount === 0
						? "Aucun filtre sélectionné"
						: `${pendingFilterCount} filtre${pendingFilterCount > 1 ? "s" : ""} sélectionné${pendingFilterCount > 1 ? "s" : ""}`}
				</div>
			</form>
		</FilterSheetWrapper>
	);
}
