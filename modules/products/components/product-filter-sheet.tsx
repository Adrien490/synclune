"use client";

import { FilterSheetWrapper } from "@/shared/components/filter-sheet-wrapper";
import { Accordion } from "@/shared/components/ui/accordion";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { useAppForm } from "@/shared/components/forms";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
	useDeferredValue,
	useEffect,
	useEffectEvent,
	useLayoutEffect,
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
	// Capture the trigger element before the sheet steals focus (WCAG 2.4.3)
	const triggerRef = useRef<HTMLElement | null>(null);
	useLayoutEffect(() => {
		if (isOpen) {
			triggerRef.current = document.activeElement as HTMLElement | null;
		}
	}, [isOpen]);
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

	const applyFilters = (formData: FilterFormData) => {
		const { fullUrl } = buildFilterURL({
			formData,
			currentSearchParams: searchParams,
			defaultPriceRange: DEFAULT_PRICE_RANGE,
			isOnCategoryPage,
			currentCategorySlug,
		});

		startTransition(() => {
			router.push(fullUrl);
			window.scrollTo({ top: 0, behavior: "smooth" });
		});
	};

	const clearAllFilters = () => {
		form.reset(getDefaultFilterValues(DEFAULT_PRICE_RANGE));

		const fullUrl = buildClearFiltersURL(searchParams);

		startTransition(() => {
			router.push(fullUrl);
			window.scrollTo({ top: 0, behavior: "smooth" });
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

	// Default open sections: types + price + any section with active filters
	const defaultOpenSections = (() => {
		const sections = ["types", "price"];
		if (initialValues.colors.length > 0) {
			sections.push("colors");
		}
		if (initialValues.materials.length > 0) {
			sections.push("materials");
		}
		if (initialValues.ratingMin !== null) {
			sections.push("rating");
		}
		if (initialValues.inStockOnly || initialValues.onSale) {
			sections.push("availability");
		}
		return sections;
	})();

	return (
		<FilterSheetWrapper
			open={isOpen}
			onOpenChange={(newOpen) => {
				if (newOpen) {
					open();
				} else {
					close();
					triggerRef.current?.focus();
				}
			}}
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
				<Accordion
					type="multiple"
					defaultValue={defaultOpenSections}
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
			</form>
		</FilterSheetWrapper>
	);
}
