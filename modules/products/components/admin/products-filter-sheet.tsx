"use client";

import { FilterSheetWrapper } from "@/shared/components/filter-sheet";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Label } from "@/shared/components/ui/label";
import { Separator } from "@/shared/components/ui/separator";
import { Slider } from "@/shared/components/ui/slider";
import { useForm } from "@tanstack/react-form";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

interface ProductsFilterSheetProps {
	className?: string;
	productTypes?: Array<{ id: string; label: string }>;
	collections?: Array<{ id: string; name: string }>;
}

interface FilterFormData {
	priceRange: [number, number];
	typeIds: string[];
	collectionIds: string[];
}

const MAX_PRICE = 50000; // 500€ in cents

export function ProductsFilterSheet({
	className,
	productTypes = [],
	collections = [],
}: ProductsFilterSheetProps) {
	const DEFAULT_PRICE_RANGE: [number, number] = [0, MAX_PRICE];
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();

	const initialValues = ((): FilterFormData => {
		const typeIds: string[] = [];
		const collectionIds: string[] = [];
		let priceMin = DEFAULT_PRICE_RANGE[0];
		let priceMax = DEFAULT_PRICE_RANGE[1];

		searchParams.forEach((value, key) => {
			if (key === "filter_typeId") {
				typeIds.push(value);
			} else if (key === "filter_collectionId") {
				collectionIds.push(value);
			} else if (key === "filter_priceMin") {
				priceMin = Number(value) || DEFAULT_PRICE_RANGE[0];
			} else if (key === "filter_priceMax") {
				priceMax = Number(value) || DEFAULT_PRICE_RANGE[1];
			}
		});

		return {
			priceRange: [priceMin, priceMax],
			typeIds: [...new Set(typeIds)],
			collectionIds: [...new Set(collectionIds)],
		};
	})();

	const form = useForm({
		defaultValues: initialValues,
		onSubmit: async ({ value }: { value: FilterFormData }) => {
			applyFilters(value);
		},
	});

	const applyFilters = (formData: FilterFormData) => {
		const params = new URLSearchParams(searchParams.toString());

		const filterKeys = [
			"filter_priceMin",
			"filter_priceMax",
			"filter_typeId",
			"filter_collectionId",
		];
		filterKeys.forEach((key) => params.delete(key));
		params.set("page", "1");

		if (formData.typeIds.length > 0) {
			formData.typeIds.forEach((id) => params.append("filter_typeId", id));
		}
		if (formData.collectionIds.length > 0) {
			formData.collectionIds.forEach((id) =>
				params.append("filter_collectionId", id)
			);
		}
		if (
			formData.priceRange[0] !== DEFAULT_PRICE_RANGE[0] ||
			formData.priceRange[1] !== DEFAULT_PRICE_RANGE[1]
		) {
			params.set("filter_priceMin", formData.priceRange[0].toString());
			params.set("filter_priceMax", formData.priceRange[1].toString());
		}

		startTransition(() => {
			router.push(`?${params.toString()}`, { scroll: false });
		});
	};

	const clearAllFilters = () => {
		const defaultValues: FilterFormData = {
			priceRange: [DEFAULT_PRICE_RANGE[0], DEFAULT_PRICE_RANGE[1]],
			typeIds: [],
			collectionIds: [],
		};
		form.reset(defaultValues);

		const params = new URLSearchParams(searchParams.toString());
		const filterKeys = [
			"filter_priceMin",
			"filter_priceMax",
			"filter_typeId",
			"filter_collectionId",
		];
		filterKeys.forEach((key) => params.delete(key));
		params.set("page", "1");

		startTransition(() => {
			router.push(`?${params.toString()}`, { scroll: false });
		});
	};

	const { hasActiveFilters, activeFiltersCount } = (() => {
		let count = 0;
		// Ne compter que les filtres gérés par ce sheet
		const sheetFilterKeys = [
			"filter_priceMin",
			"filter_priceMax",
			"filter_typeId",
			"filter_collectionId",
		];
		searchParams.forEach((_, key) => {
			if (sheetFilterKeys.includes(key)) count += 1;
		});
		return { hasActiveFilters: count > 0, activeFiltersCount: count };
	})();

	return (
		<FilterSheetWrapper
			activeFiltersCount={activeFiltersCount}
			hasActiveFilters={hasActiveFilters}
			onClearAll={clearAllFilters}
			onApply={() => form.handleSubmit()}
			isPending={isPending}
			triggerClassName={className}
		>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					form.handleSubmit();
				}}
				className="space-y-6"
			>
				{/* Price Range */}
				<form.Field name="priceRange">
					{(field) => (
						<fieldset className="space-y-3">
							<legend className="font-medium text-sm text-foreground">
								Prix final (€)
							</legend>
							<div className="space-y-3">
								<Slider
									value={field.state.value}
									onValueChange={(value) =>
										field.handleChange([value[0], value[1]])
									}
									max={MAX_PRICE}
									min={0}
									step={100}
									className="w-full"
								/>
								<div className="flex items-center justify-between text-sm text-muted-foreground">
									<span>{(field.state.value[0] / 100).toFixed(2)}€</span>
									<span>{(field.state.value[1] / 100).toFixed(2)}€</span>
								</div>
							</div>
						</fieldset>
					)}
				</form.Field>

				<Separator />

				{/* Product Types */}
				{productTypes.length > 0 && (
					<>
						<form.Field name="typeIds" mode="array">
							{(field) => (
								<fieldset className="space-y-3">
									<legend className="font-medium text-sm text-foreground">
										Types de produit
									</legend>
									<div className="space-y-2 max-h-48 overflow-y-auto" data-vaul-no-drag>
										{productTypes.map((type) => {
											const isSelected = field.state.value.includes(type.id);
											return (
												<div
													key={type.id}
													className="flex items-center space-x-2"
												>
													<Checkbox
														id={`type-${type.id}`}
														checked={isSelected}
														onCheckedChange={(checked) => {
															if (checked && !isSelected) {
																field.pushValue(type.id);
															} else if (!checked && isSelected) {
																const index = field.state.value.indexOf(
																	type.id
																);
																field.removeValue(index);
															}
														}}
														className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
													/>
													<Label
														htmlFor={`type-${type.id}`}
														className="text-sm font-normal cursor-pointer flex-1"
													>
														{type.label}
													</Label>
												</div>
											);
										})}
									</div>
								</fieldset>
							)}
						</form.Field>
						<Separator />
					</>
				)}

				{/* Collections */}
				{collections.length > 0 && (
					<>
						<form.Field name="collectionIds" mode="array">
							{(field) => (
								<fieldset className="space-y-3">
									<legend className="font-medium text-sm text-foreground">
										Collections
									</legend>
									<div className="space-y-2 max-h-48 overflow-y-auto" data-vaul-no-drag>
										{collections.map((collection) => {
											const isSelected = field.state.value.includes(
												collection.id
											);
											return (
												<div
													key={collection.id}
													className="flex items-center space-x-2"
												>
													<Checkbox
														id={`collection-${collection.id}`}
														checked={isSelected}
														onCheckedChange={(checked) => {
															if (checked && !isSelected) {
																field.pushValue(collection.id);
															} else if (!checked && isSelected) {
																const index = field.state.value.indexOf(
																	collection.id
																);
																field.removeValue(index);
															}
														}}
														className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
													/>
													<Label
														htmlFor={`collection-${collection.id}`}
														className="text-sm font-normal cursor-pointer flex-1"
													>
														{collection.name}
													</Label>
												</div>
											);
										})}
									</div>
								</fieldset>
							)}
						</form.Field>
						<Separator />
					</>
				)}
			</form>
		</FilterSheetWrapper>
	);
}
