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
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { useAppForm } from "@/shared/components/forms";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useTransition } from "react";
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

import type { GetColorsReturn } from "@/modules/colors/data/get-colors";
import type { MaterialOption } from "@/modules/materials/data/get-material-options";

interface ProductTypeOption {
	slug: string;
	label: string;
}

interface FilterSheetProps {
	colors: GetColorsReturn["colors"];
	materials: MaterialOption[];
	productTypes?: ProductTypeOption[];
	maxPriceInEuros: number;
	/** Type de produit actif (depuis le path segment /produits/[type]) */
	activeProductTypeSlug?: string;
}

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

	// Fonction pour calculer les valeurs depuis les paramètres URL
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

	// Synchroniser le formulaire avec l'URL à chaque ouverture du sheet
	useEffect(() => {
		if (isOpen) {
			const values = getValuesFromURL();
			form.reset(values);
		}
		// form.reset est stable (TanStack Form), getValuesFromURL lit searchParams
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isOpen, searchParams]);

	// Détecter si on est sur une page catégorie /produits/[type]
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
			// Scroll to top après application des filtres
			window.scrollTo({ top: 0, behavior: "smooth" });
		});
		// La fermeture est gérée par FilterSheetWrapper (useEffect sur isPending)
	};

	const clearAllFilters = () => {
		form.reset(getDefaultFilterValues(DEFAULT_PRICE_RANGE));

		const fullUrl = buildClearFiltersURL(searchParams);

		startTransition(() => {
			router.push(fullUrl);
			// Scroll to top après effacement des filtres
			window.scrollTo({ top: 0, behavior: "smooth" });
		});
		// La fermeture est gérée par FilterSheetWrapper (useEffect sur isPending)
	};

	// Calculer les filtres actifs depuis l'URL
	const { hasActiveFilters, activeFiltersCount } = countActiveFilters(searchParams);

	// Determiner les sections ouvertes par defaut (types + sections avec filtres actifs)
	const defaultOpenSections = (() => {
		const sections = ["types"];
		if (initialValues.inStockOnly || initialValues.onSale) {
			sections.unshift("availability");
		}
		if (initialValues.colors.length > 0 && !sections.includes("colors")) {
			sections.push("colors");
		}
		if (initialValues.materials.length > 0 && !sections.includes("materials")) {
			sections.push("materials");
		}
		if (initialValues.ratingMin !== null) {
			sections.push("rating");
		}
		if (
			initialValues.priceRange[0] !== DEFAULT_PRICE_RANGE[0] ||
			initialValues.priceRange[1] !== DEFAULT_PRICE_RANGE[1]
		) {
			sections.push("price");
		}
		return sections;
	})();

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
				<Accordion
					type="multiple"
					defaultValue={defaultOpenSections}
					className="w-full"
					aria-label="Filtres de recherche"
				>
					{/* Disponibilité */}
					<AccordionItem value="availability">
						<AccordionTrigger className="hover:no-underline">
							<div className="flex items-center gap-2">
								<span>Disponibilité</span>
								{(initialValues.inStockOnly || initialValues.onSale) && (
									<Badge
										variant="secondary"
										className="h-5 px-1.5 text-xs font-semibold"
									>
										{(initialValues.inStockOnly ? 1 : 0) + (initialValues.onSale ? 1 : 0)}
									</Badge>
								)}
							</div>
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

					{/* Types de produits */}
					{productTypes.length > 0 && (
						<form.Field name="productTypes" mode="array">
							{(field) => (
								<AccordionItem value="types">
									<AccordionTrigger className="hover:no-underline">
										<div className="flex items-center gap-2">
											<span>Types de bijoux</span>
											{field.state.value.length > 0 && (
												<Badge
													variant="secondary"
													className="h-5 px-1.5 text-xs font-semibold"
												>
													{field.state.value.length}
												</Badge>
											)}
										</div>
									</AccordionTrigger>
									<AccordionContent>
										<div className="space-y-1">
											{productTypes.map((type) => {
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

					{/* Couleurs */}
					{colors.length > 0 && (
						<form.Field name="colors" mode="array">
							{(field) => (
								<AccordionItem value="colors">
									<AccordionTrigger className="hover:no-underline">
										<div className="flex items-center gap-2">
											<span>Couleurs</span>
											{field.state.value.length > 0 && (
												<Badge
													variant="secondary"
													className="h-5 px-1.5 text-xs font-semibold"
												>
													{field.state.value.length}
												</Badge>
											)}
										</div>
									</AccordionTrigger>
									<AccordionContent>
										<div className="space-y-1">
											{colors.map((color) => {
												const isSelected = field.state.value.includes(
													color.slug
												);
												return (
													<CheckboxFilterItem
														key={color.slug}
														id={`color-${color.slug}`}
														checked={isSelected}
														onCheckedChange={(checked) => {
															if (checked && !isSelected) {
																field.pushValue(color.slug);
															} else if (!checked && isSelected) {
																const index = field.state.value.indexOf(
																	color.slug
																);
																field.removeValue(index);
															}
														}}
														indicator={
															<span
																className="w-5 h-5 rounded-full border border-border/50 shadow-sm ring-1 ring-inset ring-black/5"
																style={{ backgroundColor: color.hex }}
															/>
														}
														count={color._count?.skus}
													>
														{color.name}
													</CheckboxFilterItem>
												);
											})}
										</div>
									</AccordionContent>
								</AccordionItem>
							)}
						</form.Field>
					)}

					{/* Matériaux */}
					{materials.length > 0 && (
						<form.Field name="materials" mode="array">
							{(field) => (
								<AccordionItem value="materials">
									<AccordionTrigger className="hover:no-underline">
										<div className="flex items-center gap-2">
											<span>Matériaux</span>
											{field.state.value.length > 0 && (
												<Badge
													variant="secondary"
													className="h-5 px-1.5 text-xs font-semibold"
												>
													{field.state.value.length}
												</Badge>
											)}
										</div>
									</AccordionTrigger>
									<AccordionContent>
										<div className="space-y-1">
											{materials.map((material) => {
												const isSelected = field.state.value.includes(
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
															} else if (!checked && isSelected) {
																const index = field.state.value.indexOf(
																	material.slug
																);
																field.removeValue(index);
															}
														}}
													>
														{material.name}
													</CheckboxFilterItem>
												);
											})}
										</div>
									</AccordionContent>
								</AccordionItem>
							)}
						</form.Field>
					)}

					{/* Notes clients */}
					<form.Field name="ratingMin">
						{(field) => (
							<AccordionItem value="rating">
								<AccordionTrigger className="hover:no-underline">
									<div className="flex items-center gap-2">
										<span>Notes clients</span>
										{field.state.value !== null && (
											<Badge
												variant="secondary"
												className="h-5 px-1.5 text-xs font-semibold"
											>
												{field.state.value}+ ★
											</Badge>
										)}
									</div>
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

					{/* Prix */}
					<form.Field name="priceRange">
						{(field) => {
							const hasCustomPrice =
								field.state.value[0] !== 0 ||
								field.state.value[1] !== maxPriceInEuros;
							return (
								<AccordionItem value="price" className="border-b-0">
									<AccordionTrigger className="hover:no-underline">
										<div className="flex items-center gap-2">
											<span>Prix</span>
											{hasCustomPrice && (
												<Badge
													variant="secondary"
													className="h-5 px-1.5 text-xs font-semibold"
												>
													{field.state.value[0]}€ - {field.state.value[1]}€
												</Badge>
											)}
										</div>
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
				</Accordion>
			</form>
		</FilterSheetWrapper>
	);
}
