"use client";

import { CheckboxFilterItem } from "@/shared/components/forms/checkbox-filter-item";
import { FilterSheetWrapper } from "@/shared/components/filter-sheet-wrapper";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/shared/components/ui/accordion";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { useAppForm } from "@/shared/components/forms";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { PRODUCT_FILTER_DIALOG_ID } from "@/modules/products/constants/product.constants";
import { PriceRangeInputs } from "./price-range-inputs";
import { RatingStars } from "@/shared/components/rating-stars";
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
import { Check, Search, X } from "lucide-react";

import type { GetColorsReturn } from "@/modules/colors/data/get-colors";
import type { MaterialOption } from "@/modules/materials/data/get-material-options";

// ============================================================================
// TYPES
// ============================================================================

interface ProductTypeOption {
	slug: string;
	label: string;
	_count?: { products: number };
}

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

const SEARCH_THRESHOLD = 8;

/** Detect if a hex color is light (luminance > 0.85) */
function isLightColor(hex: string): boolean {
	const clean = hex.replace("#", "");
	const r = parseInt(clean.substring(0, 2), 16) / 255;
	const g = parseInt(clean.substring(2, 4), 16) / 255;
	const b = parseInt(clean.substring(4, 6), 16) / 255;
	// Relative luminance (sRGB)
	const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
	return luminance > 0.85;
}

/** Check overlay color based on hex luminance */
function getCheckColor(hex: string): string {
	const clean = hex.replace("#", "");
	const r = parseInt(clean.substring(0, 2), 16) / 255;
	const g = parseInt(clean.substring(2, 4), 16) / 255;
	const b = parseInt(clean.substring(4, 6), 16) / 255;
	const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
	return luminance > 0.5 ? "#000000" : "#ffffff";
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function SectionHeader({
	label,
	count,
	badgeContent,
	onReset,
}: {
	label: string;
	count?: number;
	badgeContent?: React.ReactNode;
	onReset?: () => void;
}) {
	return (
		<div className="flex items-center gap-2 flex-1">
			<span>{label}</span>
			{count !== undefined && count > 0 && (
				<Badge
					variant="secondary"
					className="h-5 px-1.5 text-xs font-semibold"
				>
					{badgeContent ?? count}
				</Badge>
			)}
			{onReset && count !== undefined && count > 0 && (
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onReset();
					}}
					className="ml-auto p-1 rounded-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
					aria-label={`Effacer le filtre ${label}`}
				>
					<X className="w-3 h-3" />
				</button>
			)}
		</div>
	);
}

function SectionSearch({
	value,
	onChange,
}: {
	value: string;
	onChange: (value: string) => void;
}) {
	return (
		<div className="relative mb-2">
			<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
			<Input
				type="text"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder="Rechercher..."
				className="h-8 text-xs pl-8 pr-3"
			/>
		</div>
	);
}

// ============================================================================
// PRESETS
// ============================================================================

interface FilterPreset {
	label: string;
	apply: (setField: (name: keyof FilterFormData, value: unknown) => void) => void;
	isActive: (values: FilterFormData) => boolean;
	reset: (setField: (name: keyof FilterFormData, value: unknown) => void, defaultPriceRange: [number, number]) => void;
}

function getPresets(): FilterPreset[] {
	return [
		{
			label: "Petits prix",
			apply: (setField) => {
				setField("priceRange", [0, 30]);
			},
			isActive: (values) =>
				values.priceRange[0] === 0 && values.priceRange[1] === 30,
			reset: (setField, defaultPriceRange) => {
				setField("priceRange", defaultPriceRange);
			},
		},
		{
			label: "Les mieux notés",
			apply: (setField) => {
				setField("ratingMin", 4);
			},
			isActive: (values) => values.ratingMin === 4,
			reset: (setField) => {
				setField("ratingMin", null);
			},
		},
		{
			label: "En promo",
			apply: (setField) => {
				setField("onSale", true);
			},
			isActive: (values) => values.onSale === true,
			reset: (setField) => {
				setField("onSale", false);
			},
		},
		{
			label: "En stock",
			apply: (setField) => {
				setField("inStockOnly", true);
			},
			isActive: (values) => values.inStockOnly === true,
			reset: (setField) => {
				setField("inStockOnly", false);
			},
		},
	];
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ProductFilterSheet({
	colors = [],
	materials = [],
	productTypes = [],
	maxPriceInEuros,
	activeProductTypeSlug,
}: FilterSheetProps) {
	const { isOpen, open, close } = useDialog(PRODUCT_FILTER_DIALOG_ID);
	const DEFAULT_PRICE_RANGE: [number, number] = [0, maxPriceInEuros];
	const pathname = usePathname();
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();

	// Search state for long lists
	const [colorSearch, setColorSearch] = useState("");
	const [materialSearch, setMaterialSearch] = useState("");

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

	useEffect(() => {
		if (isOpen) {
			const values = getValuesFromURL();
			form.reset(values);
			// Reset search fields on open
			setColorSearch("");
			setMaterialSearch("");
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
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
	const sortedColors = [...colors].sort(
		(a, b) => (b._count?.skus ?? 0) - (a._count?.skus ?? 0)
	);
	const sortedMaterials = [...materials].sort(
		(a, b) => (b._count?.skus ?? 0) - (a._count?.skus ?? 0)
	);
	const sortedProductTypes = [...productTypes].sort(
		(a, b) => (b._count?.products ?? 0) - (a._count?.products ?? 0)
	);

	// Filter lists by search term
	const filteredColors = colorSearch
		? sortedColors.filter((c) =>
				c.name.toLowerCase().includes(colorSearch.toLowerCase())
			)
		: sortedColors;
	const filteredMaterials = materialSearch
		? sortedMaterials.filter((m) =>
				m.name.toLowerCase().includes(materialSearch.toLowerCase())
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
		if (
			initialValues.priceRange[0] !== DEFAULT_PRICE_RANGE[0] ||
			initialValues.priceRange[1] !== DEFAULT_PRICE_RANGE[1]
		) {
			// Already included by default
		}
		return sections;
	})();

	// Presets
	const presets = getPresets();
	const setField = (name: keyof FilterFormData, value: unknown) => {
		form.setFieldValue(name, value as never);
	};

	return (
		<FilterSheetWrapper
			open={isOpen}
			onOpenChange={(newOpen) => (newOpen ? open() : close())}
			hideTrigger
			activeFiltersCount={activeFiltersCount}
			hasActiveFilters={hasActiveFilters}
			onApply={() => form.handleSubmit()}
			onClearAll={clearAllFilters}
			isPending={isPending}
			title="Filtres"
			description="Affine ta recherche"
		>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					form.handleSubmit();
				}}
			>
				{/* Quick presets */}
				<div className="flex gap-2 overflow-x-auto pb-3 mb-1 border-b border-border/50 scrollbar-none">
					{presets.map((preset) => {
						const isActive = preset.isActive(form.state.values);
						return (
							<Button
								key={preset.label}
								type="button"
								variant={isActive ? "default" : "outline"}
								size="sm"
								className="rounded-full shrink-0 text-xs h-8"
								onClick={() => {
									if (isActive) {
										preset.reset(setField, DEFAULT_PRICE_RANGE);
									} else {
										preset.apply(setField);
									}
								}}
							>
								{preset.label}
							</Button>
						);
					})}
				</div>

				<Accordion
					type="multiple"
					defaultValue={defaultOpenSections}
					className="w-full"
					aria-label="Filtres de recherche"
				>
					{/* 1. Types de bijoux */}
					{sortedProductTypes.length > 0 && (
						<form.Field name="productTypes" mode="array">
							{(field) => (
								<AccordionItem value="types">
									<AccordionTrigger className="hover:no-underline">
										<SectionHeader
											label="Types de bijoux"
											count={field.state.value.length}
											onReset={() => field.handleChange([])}
										/>
									</AccordionTrigger>
									<AccordionContent>
										<div className="space-y-1">
											{sortedProductTypes.map((type) => {
												const isSelected = field.state.value.includes(
													type.slug
												);
												return (
													<CheckboxFilterItem
														key={type.slug}
														id={`type-${type.slug}`}
														checked={isSelected}
														onCheckedChange={(checked) => {
															if (checked && !isSelected) {
																field.pushValue(type.slug);
															} else if (!checked && isSelected) {
																const index = field.state.value.indexOf(
																	type.slug
																);
																field.removeValue(index);
															}
														}}
														count={type._count?.products}
													>
														{type.label}
													</CheckboxFilterItem>
												);
											})}
										</div>
									</AccordionContent>
								</AccordionItem>
							)}
						</form.Field>
					)}

					{/* 2. Prix */}
					<form.Field name="priceRange">
						{(field) => {
							const hasCustomPrice =
								field.state.value[0] !== 0 ||
								field.state.value[1] !== maxPriceInEuros;
							return (
								<AccordionItem value="price">
									<AccordionTrigger className="hover:no-underline">
										<SectionHeader
											label="Prix"
											count={hasCustomPrice ? 1 : 0}
											badgeContent={
												hasCustomPrice
													? `${field.state.value[0]}€ - ${field.state.value[1]}€`
													: undefined
											}
											onReset={() =>
												field.handleChange(DEFAULT_PRICE_RANGE)
											}
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
					{sortedColors.length > 0 && (
						<form.Field name="colors" mode="array">
							{(field) => (
								<AccordionItem value="colors">
									<AccordionTrigger className="hover:no-underline">
										<SectionHeader
											label="Couleurs"
											count={field.state.value.length}
											onReset={() => field.handleChange([])}
										/>
									</AccordionTrigger>
									<AccordionContent>
										{sortedColors.length > SEARCH_THRESHOLD && (
											<SectionSearch
												value={colorSearch}
												onChange={setColorSearch}
											/>
										)}
										<div className="space-y-1">
											{filteredColors.length === 0 ? (
												<p className="text-xs text-muted-foreground py-2 text-center">
													Aucun résultat
												</p>
											) : (
												filteredColors.map((color) => {
													const isSelected = field.state.value.includes(
														color.slug
													);
													const light = isLightColor(color.hex);
													return (
														<CheckboxFilterItem
															key={color.slug}
															id={`color-${color.slug}`}
															checked={isSelected}
															onCheckedChange={(checked) => {
																if (checked && !isSelected) {
																	field.pushValue(color.slug);
																} else if (!checked && isSelected) {
																	const index =
																		field.state.value.indexOf(
																			color.slug
																		);
																	field.removeValue(index);
																}
															}}
															indicator={
																<span
																	className={`relative w-6 h-6 rounded-full shadow-sm ${
																		light
																			? "border border-border"
																			: "border border-border/50"
																	} ${
																		isSelected
																			? "ring-2 ring-primary ring-offset-1"
																			: "ring-1 ring-inset ring-black/5"
																	}`}
																	style={{
																		backgroundColor: color.hex,
																	}}
																>
																	{isSelected && (
																		<Check
																			className="absolute inset-0 m-auto w-3 h-3"
																			style={{
																				color: getCheckColor(
																					color.hex
																				),
																			}}
																			strokeWidth={3}
																		/>
																	)}
																</span>
															}
															count={color._count?.skus}
														>
															{color.name}
														</CheckboxFilterItem>
													);
												})
											)}
										</div>
									</AccordionContent>
								</AccordionItem>
							)}
						</form.Field>
					)}

					{/* 4. Matériaux */}
					{sortedMaterials.length > 0 && (
						<form.Field name="materials" mode="array">
							{(field) => (
								<AccordionItem value="materials">
									<AccordionTrigger className="hover:no-underline">
										<SectionHeader
											label="Matériaux"
											count={field.state.value.length}
											onReset={() => field.handleChange([])}
										/>
									</AccordionTrigger>
									<AccordionContent>
										{sortedMaterials.length > SEARCH_THRESHOLD && (
											<SectionSearch
												value={materialSearch}
												onChange={setMaterialSearch}
											/>
										)}
										<div className="space-y-1">
											{filteredMaterials.length === 0 ? (
												<p className="text-xs text-muted-foreground py-2 text-center">
													Aucun résultat
												</p>
											) : (
												filteredMaterials.map((material) => {
													const isSelected =
														field.state.value.includes(
															material.slug
														);
													return (
														<CheckboxFilterItem
															key={material.slug}
															id={`material-${material.slug}`}
															checked={isSelected}
															onCheckedChange={(checked) => {
																if (checked && !isSelected) {
																	field.pushValue(material.slug);
																} else if (
																	!checked &&
																	isSelected
																) {
																	const index =
																		field.state.value.indexOf(
																			material.slug
																		);
																	field.removeValue(index);
																}
															}}
															count={material._count?.skus}
														>
															{material.name}
														</CheckboxFilterItem>
													);
												})
											)}
										</div>
									</AccordionContent>
								</AccordionItem>
							)}
						</form.Field>
					)}

					{/* 5. Notes clients */}
					<form.Field name="ratingMin">
						{(field) => (
							<AccordionItem value="rating">
								<AccordionTrigger className="hover:no-underline">
									<SectionHeader
										label="Notes clients"
										count={field.state.value !== null ? 1 : 0}
										badgeContent={
											field.state.value !== null
												? `${field.state.value}+ ★`
												: undefined
										}
										onReset={() => field.handleChange(null)}
									/>
								</AccordionTrigger>
								<AccordionContent>
									<div className="space-y-1">
										{[5, 4, 3, 2, 1].map((stars) => {
											const isSelected = field.state.value === stars;
											return (
												<CheckboxFilterItem
													key={stars}
													id={`rating-${stars}`}
													checked={isSelected}
													onCheckedChange={(checked) => {
														field.handleChange(checked ? stars : null);
													}}
													indicator={<RatingStars rating={stars} size="sm" />}
												>
													{stars === 1
														? "1 étoile et plus"
														: `${stars} étoiles et plus`}
												</CheckboxFilterItem>
											);
										})}
									</div>
								</AccordionContent>
							</AccordionItem>
						)}
					</form.Field>

					{/* 6. Disponibilité */}
					<AccordionItem value="availability" className="border-b-0">
						<AccordionTrigger className="hover:no-underline">
							<SectionHeader
								label="Disponibilité"
								count={
									(form.state.values.inStockOnly ? 1 : 0) +
									(form.state.values.onSale ? 1 : 0)
								}
								onReset={() => {
									form.setFieldValue("inStockOnly", false);
									form.setFieldValue("onSale", false);
								}}
							/>
						</AccordionTrigger>
						<AccordionContent>
							<div className="space-y-1">
								<form.Field name="inStockOnly">
									{(field) => (
										<CheckboxFilterItem
											id="filter-in-stock"
											checked={field.state.value}
											onCheckedChange={(checked) => {
												field.handleChange(checked === true);
											}}
										>
											En stock uniquement
										</CheckboxFilterItem>
									)}
								</form.Field>
								<form.Field name="onSale">
									{(field) => (
										<CheckboxFilterItem
											id="filter-on-sale"
											checked={field.state.value}
											onCheckedChange={(checked) => {
												field.handleChange(checked === true);
											}}
										>
											En promotion
										</CheckboxFilterItem>
									)}
								</form.Field>
							</div>
						</AccordionContent>
					</AccordionItem>
				</Accordion>
			</form>
		</FilterSheetWrapper>
	);
}
