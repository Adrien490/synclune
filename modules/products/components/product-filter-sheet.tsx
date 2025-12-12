"use client";

import { CheckboxFilterItem } from "@/shared/components/forms/checkbox-filter-item";
import { FilterSheetWrapper } from "@/shared/components/filter-sheet";
import { Separator } from "@/shared/components/ui/separator";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { useForm } from "@tanstack/react-form";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { PRODUCT_FILTER_DIALOG_ID } from "./product-filter-fab";
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

	const form = useForm({
		defaultValues: initialValues,
		onSubmit: async ({ value }) => {
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
			close();
		});
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
			close();
		});
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

	return (
		<FilterSheetWrapper
			open={isOpen}
			onOpenChange={(newOpen) => (newOpen ? open() : close())}
			hideTrigger
			activeFiltersCount={activeFiltersCount}
			hasActiveFilters={hasActiveFilters}
			onClearAll={clearAllFilters}
			onApply={() => form.handleSubmit()}
			isPending={isPending}
			title="Filtres"
			description="Affine ta recherche"
		>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					form.handleSubmit();
				}}
				className="space-y-6"
			>
				{/* Types de produits */}
				{productTypes.length > 0 && (
					<form.Field name="productTypes" mode="array">
						{(field) => (
							<fieldset className="space-y-1 border-0 p-0 m-0">
								<legend className="font-medium text-sm text-foreground mb-2">
									Types de bijoux
								</legend>
								{productTypes.map((type) => {
									const isSelected = field.state.value.includes(type.slug);
									return (
										<CheckboxFilterItem
											key={type.slug}
											id={`type-${type.slug}`}
											checked={isSelected}
											onCheckedChange={(checked) => {
												if (checked && !isSelected) {
													field.pushValue(type.slug);
												} else if (!checked && isSelected) {
													const index = field.state.value.indexOf(type.slug);
													field.removeValue(index);
												}
											}}
										>
											{type.label}
										</CheckboxFilterItem>
									);
								})}
							</fieldset>
						)}
					</form.Field>
				)}

				{/* Couleurs */}
				{productTypes.length > 0 && colors.length > 0 && <Separator />}
				<form.Field name="colors" mode="array">
					{(field) => (
						<fieldset className="space-y-1 border-0 p-0 m-0">
							<legend className="font-medium text-sm text-foreground mb-2">
								Couleurs
							</legend>
							{colors.map((color) => {
								const isSelected = field.state.value.includes(color.slug);
								return (
									<CheckboxFilterItem
										key={color.slug}
										id={`color-${color.slug}`}
										checked={isSelected}
										onCheckedChange={(checked) => {
											if (checked && !isSelected) {
												field.pushValue(color.slug);
											} else if (!checked && isSelected) {
												const index = field.state.value.indexOf(color.slug);
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
						</fieldset>
					)}
				</form.Field>

				{/* Matériaux */}
				{materials.length > 0 && (
					<>
						<Separator />
						<form.Field name="materials" mode="array">
							{(field) => (
								<fieldset className="space-y-1 border-0 p-0 m-0">
									<legend className="font-medium text-sm text-foreground mb-2">
										Matériaux
									</legend>
									{materials.map((material) => {
										const isSelected = field.state.value.includes(material.id);
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
								</fieldset>
							)}
						</form.Field>
					</>
				)}

				<Separator />

				{/* Prix */}
				<form.Field name="priceRange">
					{(field) => (
						<PriceRangeInputs
							value={field.state.value}
							onChange={field.handleChange}
							maxPrice={maxPriceInEuros}
						/>
					)}
				</form.Field>
			</form>
		</FilterSheetWrapper>
	);
}
