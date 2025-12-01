"use client";

import { FilterSheetWrapper } from "@/shared/components/filter-sheet";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Label } from "@/shared/components/ui/label";
import { Separator } from "@/shared/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group";
import type { ColorOption } from "@/modules/colors/data/get-colors";
import type { MaterialOption } from "@/modules/materials/data/get-materials";
import { useForm } from "@tanstack/react-form";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useTransition } from "react";

interface SkusFilterSheetProps {
	className?: string;
	colorOptions: ColorOption[];
	materialOptions: MaterialOption[];
}

interface FilterFormData {
	stockStatuses: string[];
	colorIds: string[];
	materialIds: string[];
	isActive: "all" | "active" | "inactive";
}

const STOCK_STATUS_OPTIONS = [
	{ value: "in_stock", label: "En stock" },
	{ value: "low_stock", label: "Stock faible" },
	{ value: "out_of_stock", label: "Rupture" },
] as const;

const ACTIVE_STATUS_OPTIONS = [
	{ value: "all", label: "Toutes" },
	{ value: "active", label: "Actives uniquement" },
	{ value: "inactive", label: "Inactives uniquement" },
] as const;

export function SkusFilterSheet({
	className,
	colorOptions,
	materialOptions,
}: SkusFilterSheetProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();

	// Initialiser les valeurs depuis l'URL
	const initialValues = useMemo((): FilterFormData => {
		const stockStatuses: string[] = [];
		const colorIds: string[] = [];
		const materialIds: string[] = [];
		let isActive: "all" | "active" | "inactive" = "all";

		searchParams.forEach((value, key) => {
			if (key === "filter_stockStatus" && value !== "all") {
				stockStatuses.push(value);
			} else if (key === "filter_colorId") {
				colorIds.push(value);
			} else if (key === "filter_materialId") {
				materialIds.push(value);
			} else if (key === "filter_isActive") {
				if (value === "true") isActive = "active";
				else if (value === "false") isActive = "inactive";
			}
		});

		return {
			stockStatuses: [...new Set(stockStatuses)],
			colorIds: [...new Set(colorIds)],
			materialIds: [...new Set(materialIds)],
			isActive,
		};
	}, [searchParams]);

	const form = useForm({
		defaultValues: initialValues,
		onSubmit: async ({ value }: { value: FilterFormData }) => {
			applyFilters(value);
		},
	});

	const applyFilters = (formData: FilterFormData) => {
		const params = new URLSearchParams(searchParams.toString());

		// Supprimer tous les filtres geres par ce sheet
		const filterKeys = [
			"filter_stockStatus",
			"filter_colorId",
			"filter_materialId",
			"filter_isActive",
		];
		filterKeys.forEach((key) => params.delete(key));

		// Reset cursor pour la pagination
		params.delete("cursor");
		params.delete("direction");

		// Ajouter les statuts de stock
		if (formData.stockStatuses.length > 0) {
			formData.stockStatuses.forEach((status) =>
				params.append("filter_stockStatus", status)
			);
		}

		// Ajouter les couleurs
		if (formData.colorIds.length > 0) {
			formData.colorIds.forEach((id) => params.append("filter_colorId", id));
		}

		// Ajouter les materiaux
		if (formData.materialIds.length > 0) {
			formData.materialIds.forEach((id) =>
				params.append("filter_materialId", id)
			);
		}

		// Ajouter le statut actif/inactif
		if (formData.isActive === "active") {
			params.set("filter_isActive", "true");
		} else if (formData.isActive === "inactive") {
			params.set("filter_isActive", "false");
		}

		startTransition(() => {
			router.push(`?${params.toString()}`, { scroll: false });
		});
	};

	const clearAllFilters = () => {
		const defaultValues: FilterFormData = {
			stockStatuses: [],
			colorIds: [],
			materialIds: [],
			isActive: "all",
		};
		form.reset(defaultValues);

		const params = new URLSearchParams(searchParams.toString());
		const filterKeys = [
			"filter_stockStatus",
			"filter_colorId",
			"filter_materialId",
			"filter_isActive",
		];
		filterKeys.forEach((key) => params.delete(key));
		params.delete("cursor");
		params.delete("direction");

		startTransition(() => {
			router.push(`?${params.toString()}`, { scroll: false });
		});
	};

	// Calculer les filtres actifs depuis l'URL
	const { hasActiveFilters, activeFiltersCount } = useMemo(() => {
		let count = 0;
		const sheetFilterKeys = [
			"filter_stockStatus",
			"filter_colorId",
			"filter_materialId",
			"filter_isActive",
		];
		searchParams.forEach((value, key) => {
			if (sheetFilterKeys.includes(key) && value !== "all") {
				count += 1;
			}
		});
		return { hasActiveFilters: count > 0, activeFiltersCount: count };
	}, [searchParams]);

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
				{/* Statut actif/inactif */}
				<form.Field name="isActive">
					{(field) => (
						<div className="space-y-3">
							<h4 className="font-medium text-sm text-foreground">
								Statut de la variante
							</h4>
							<RadioGroup
								value={field.state.value}
								onValueChange={(value) =>
									field.handleChange(value as "all" | "active" | "inactive")
								}
								className="space-y-2"
							>
								{ACTIVE_STATUS_OPTIONS.map(({ value, label }) => (
									<div key={value} className="flex items-center space-x-2">
										<RadioGroupItem value={value} id={`active-${value}`} />
										<Label
											htmlFor={`active-${value}`}
											className="text-sm font-normal cursor-pointer flex-1"
										>
											{label}
										</Label>
									</div>
								))}
							</RadioGroup>
						</div>
					)}
				</form.Field>

				<Separator />

				{/* Statut du stock */}
				<form.Field name="stockStatuses" mode="array">
					{(field) => (
						<div className="space-y-3">
							<h4 className="font-medium text-sm text-foreground">
								Statut du stock
							</h4>
							<div className="space-y-2">
								{STOCK_STATUS_OPTIONS.map(({ value, label }) => {
									const isSelected = field.state.value.includes(value);
									return (
										<div key={value} className="flex items-center space-x-2">
											<Checkbox
												id={`stock-${value}`}
												checked={isSelected}
												onCheckedChange={(checked) => {
													if (checked && !isSelected) {
														field.pushValue(value);
													} else if (!checked && isSelected) {
														const index = field.state.value.indexOf(value);
														field.removeValue(index);
													}
												}}
												className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
											/>
											<Label
												htmlFor={`stock-${value}`}
												className="text-sm font-normal cursor-pointer flex-1"
											>
												{label}
											</Label>
										</div>
									);
								})}
							</div>
						</div>
					)}
				</form.Field>

				<Separator />

				{/* Couleurs */}
				{colorOptions.length > 0 && (
					<>
						<form.Field name="colorIds" mode="array">
							{(field) => (
								<div className="space-y-3">
									<h4 className="font-medium text-sm text-foreground">
										Couleur
									</h4>
									<div className="space-y-2 max-h-48 overflow-y-auto">
										{colorOptions.map((color) => {
											const isSelected = field.state.value.includes(color.id);
											return (
												<div
													key={color.id}
													className="flex items-center space-x-2"
												>
													<Checkbox
														id={`color-${color.id}`}
														checked={isSelected}
														onCheckedChange={(checked) => {
															if (checked && !isSelected) {
																field.pushValue(color.id);
															} else if (!checked && isSelected) {
																const index = field.state.value.indexOf(
																	color.id
																);
																field.removeValue(index);
															}
														}}
														className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
													/>
													<span
														className="w-4 h-4 rounded-full border border-border shrink-0"
														style={{ backgroundColor: color.hex }}
													/>
													<Label
														htmlFor={`color-${color.id}`}
														className="text-sm font-normal cursor-pointer flex-1"
													>
														{color.name}
													</Label>
												</div>
											);
										})}
									</div>
								</div>
							)}
						</form.Field>
						<Separator />
					</>
				)}

				{/* Materiaux */}
				{materialOptions.length > 0 && (
					<form.Field name="materialIds" mode="array">
						{(field) => (
							<div className="space-y-3">
								<h4 className="font-medium text-sm text-foreground">
									Materiau
								</h4>
								<div className="space-y-2 max-h-48 overflow-y-auto">
									{materialOptions.map((material) => {
										const isSelected = field.state.value.includes(material.id);
										return (
											<div
												key={material.id}
												className="flex items-center space-x-2"
											>
												<Checkbox
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
													className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
												/>
												<Label
													htmlFor={`material-${material.id}`}
													className="text-sm font-normal cursor-pointer flex-1"
												>
													{material.name}
												</Label>
											</div>
										);
									})}
								</div>
							</div>
						)}
					</form.Field>
				)}
			</form>
		</FilterSheetWrapper>
	);
}
