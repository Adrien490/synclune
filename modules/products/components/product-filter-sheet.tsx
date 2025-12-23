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
import { useTransition } from "react";
import { PRODUCT_FILTER_DIALOG_ID } from "@/modules/products/constants/product.constants";
import { PriceRangeInputs } from "./price-range-inputs";

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
}

interface FilterFormData {
	colors: string[];
	materials: string[];
	productTypes: string[];
	priceRange: [number, number];
}

export function ProductFilterSheet({
	colors = [],
	materials = [],
	productTypes = [],
	maxPriceInEuros,
}: FilterSheetProps) {
	const { isOpen, open, close } = useDialog(PRODUCT_FILTER_DIALOG_ID);
	const DEFAULT_PRICE_RANGE = [0, maxPriceInEuros];
	const pathname = usePathname();
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();

	// Initialisation des valeurs depuis les paramètres URL
	const initialValues = ((): FilterFormData => {
		const colors: string[] = [];
		const materials: string[] = [];
		const types: string[] = [];
		let priceMin = DEFAULT_PRICE_RANGE[0];
		let priceMax = DEFAULT_PRICE_RANGE[1];

		searchParams.forEach((value, key) => {
			if (key === "color") {
				colors.push(value);
			} else if (key === "material") {
				materials.push(value);
			} else if (key === "type") {
				types.push(value);
			} else if (key === "priceMin") {
				priceMin = Number(value) || DEFAULT_PRICE_RANGE[0];
			} else if (key === "priceMax") {
				priceMax = Number(value) || DEFAULT_PRICE_RANGE[1];
			}
		});

		return {
			colors: [...new Set(colors)],
			materials: [...new Set(materials)],
			productTypes: [...new Set(types)],
			priceRange: [priceMin, priceMax],
		};
	})();

	const form = useAppForm({
		defaultValues: initialValues,
		onSubmit: async ({ value }: { value: FilterFormData }) => {
			applyFilters(value);
		},
	});

	const applyFilters = (formData: FilterFormData) => {
		const params = new URLSearchParams(searchParams.toString());

		// Nettoyer tous les anciens filtres
		const filterKeys = ["color", "material", "type", "priceMin", "priceMax"];
		filterKeys.forEach((key) => {
			params.delete(key);
		});

		params.set("page", "1");

		// Types de produits
		if (formData.productTypes.length > 0) {
			if (formData.productTypes.length === 1) {
				params.set("type", formData.productTypes[0]);
			} else {
				formData.productTypes.forEach((type) => params.append("type", type));
			}
		}

		// Couleurs
		if (formData.colors.length > 0) {
			if (formData.colors.length === 1) {
				params.set("color", formData.colors[0]);
			} else {
				formData.colors.forEach((color) => params.append("color", color));
			}
		}

		// Matériaux
		if (formData.materials.length > 0) {
			if (formData.materials.length === 1) {
				params.set("material", formData.materials[0]);
			} else {
				formData.materials.forEach((material) =>
					params.append("material", material)
				);
			}
		}

		// Prix
		if (
			formData.priceRange[0] !== DEFAULT_PRICE_RANGE[0] ||
			formData.priceRange[1] !== DEFAULT_PRICE_RANGE[1]
		) {
			params.set("priceMin", formData.priceRange[0].toString());
			params.set("priceMax", formData.priceRange[1].toString());
		}

		startTransition(() => {
			router.push(`${pathname}?${params.toString()}`);
			// Scroll to top après application des filtres
			window.scrollTo({ top: 0, behavior: "smooth" });
		});
		// La fermeture est gérée par FilterSheetWrapper (useEffect sur isPending)
	};

	const clearAllFilters = () => {
		const defaultValues: FilterFormData = {
			colors: [],
			materials: [],
			productTypes: [],
			priceRange: [DEFAULT_PRICE_RANGE[0], DEFAULT_PRICE_RANGE[1]],
		};

		form.reset(defaultValues);

		const params = new URLSearchParams(searchParams.toString());
		const filterKeys = ["color", "material", "type", "priceMin", "priceMax"];
		filterKeys.forEach((key) => {
			params.delete(key);
		});
		params.set("page", "1");

		startTransition(() => {
			router.push(`${pathname}?${params.toString()}`);
			// Scroll to top après effacement des filtres
			window.scrollTo({ top: 0, behavior: "smooth" });
		});
		// La fermeture est gérée par FilterSheetWrapper (useEffect sur isPending)
	};

	// Calculer les filtres actifs depuis l'URL
	const { hasActiveFilters, activeFiltersCount } = (() => {
		let count = 0;

		searchParams.forEach((value, key) => {
			if (["page", "perPage", "sortBy", "search"].includes(key)) {
				return;
			}

			if (key === "type") {
				count += 1;
			} else if (key === "color") {
				count += 1;
			} else if (key === "material") {
				count += 1;
			} else if (key === "priceMin" || key === "priceMax") {
				if (key === "priceMin") count += 1;
			}
		});

		return {
			hasActiveFilters: count > 0,
			activeFiltersCount: count,
		};
	})();

	// Determiner les sections ouvertes par defaut (types + sections avec filtres actifs)
	const defaultOpenSections = (() => {
		const sections = ["types"];
		if (initialValues.colors.length > 0 && !sections.includes("colors")) {
			sections.push("colors");
		}
		if (initialValues.materials.length > 0 && !sections.includes("materials")) {
			sections.push("materials");
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
				>
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
													material.id
												);
												return (
													<CheckboxFilterItem
														key={material.id}
														id={`material-${material.id}`}
														checked={isSelected}
														onCheckedChange={(checked) => {
															if (checked && !isSelected) {
																field.pushValue(material.id);
															} else if (!checked && isSelected) {
																const index = field.state.value.indexOf(
																	material.id
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
