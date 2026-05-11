"use client";

import { FilterSheetWrapper } from "@/shared/components/filter-sheet-wrapper";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Label } from "@/shared/components/ui/label";
import { Separator } from "@/shared/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group";
import type { ColorOption } from "@/modules/colors/data/get-color-options";
import type { MaterialOption } from "@/modules/materials/data/get-material-options";
import { useAppForm } from "@/shared/components/forms";
import { withViewTransition } from "@/shared/utils/view-transition";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState, useTransition, Suspense, type ComponentProps } from "react";

import { FilterCheckboxGroup, type CheckboxArrayField } from "./skus-filter/filter-checkbox-group";
import {
	SKU_ACTIVE_STATUS_OPTIONS,
	SKU_FILTER_KEYS,
	SKU_STOCK_STATUS_OPTIONS,
	type SkuActiveFilter,
	type SkusFilterFormData,
} from "./skus-filter/skus-filter-options";

interface SkusFilterSheetProps {
	className?: string;
	colorOptions: ColorOption[];
	materialOptions: MaterialOption[];
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	hideTrigger?: boolean;
}

function readFiltersFromSearchParams(searchParams: URLSearchParams): SkusFilterFormData {
	const stockStatuses: string[] = [];
	const colorIds: string[] = [];
	const materialIds: string[] = [];
	let isActive: SkuActiveFilter = "all";

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
}

function buildFilterUrl(searchParams: URLSearchParams, formData: SkusFilterFormData): string {
	const params = new URLSearchParams(searchParams.toString());
	SKU_FILTER_KEYS.forEach((key) => params.delete(key));
	params.delete("cursor");
	params.delete("direction");

	formData.stockStatuses.forEach((s) => params.append("filter_stockStatus", s));
	formData.colorIds.forEach((id) => params.append("filter_colorId", id));
	formData.materialIds.forEach((id) => params.append("filter_materialId", id));

	if (formData.isActive === "active") params.set("filter_isActive", "true");
	else if (formData.isActive === "inactive") params.set("filter_isActive", "false");

	return params.toString();
}

function countActiveFilters(searchParams: URLSearchParams): number {
	let count = 0;
	searchParams.forEach((value, key) => {
		if ((SKU_FILTER_KEYS as readonly string[]).includes(key) && value !== "all") count += 1;
	});
	return count;
}

function SkusFilterSheetInner({
	className,
	colorOptions,
	materialOptions,
	open: controlledOpen,
	onOpenChange: controlledOnOpenChange,
	hideTrigger,
}: SkusFilterSheetProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();
	const [internalOpen, setInternalOpen] = useState(false);
	const isOpen = controlledOpen ?? internalOpen;

	// Focus restoration WCAG 2.4.3 — capture activeElement à l'ouverture,
	// restaure via rAF + preventScroll à la fermeture (évite jump iOS).
	const previousFocusRef = useRef<HTMLElement | null>(null);

	const handleOpenChange = (nextOpen: boolean) => {
		if (nextOpen) {
			previousFocusRef.current = document.activeElement as HTMLElement | null;
		}
		(controlledOnOpenChange ?? setInternalOpen)(nextOpen);
		if (!nextOpen) {
			requestAnimationFrame(() => previousFocusRef.current?.focus({ preventScroll: true }));
		}
	};

	const initialValues = readFiltersFromSearchParams(searchParams);

	const form = useAppForm({
		defaultValues: initialValues,
		onSubmit: async ({ value }: { value: SkusFilterFormData }) => {
			applyFilters(value);
		},
	});

	const applyFilters = (formData: SkusFilterFormData) => {
		const query = buildFilterUrl(searchParams, formData);
		startTransition(() => {
			withViewTransition(() => router.push(`?${query}`, { scroll: false }));
		});
	};

	const clearAllFilters = () => {
		const defaultValues: SkusFilterFormData = {
			stockStatuses: [],
			colorIds: [],
			materialIds: [],
			isActive: "all",
		};
		form.reset(defaultValues);
		const query = buildFilterUrl(searchParams, defaultValues);
		startTransition(() => {
			withViewTransition(() => router.push(`?${query}`, { scroll: false }));
		});
	};

	const activeFiltersCount = countActiveFilters(searchParams);
	const hasActiveFilters = activeFiltersCount > 0;

	return (
		<FilterSheetWrapper
			open={isOpen}
			onOpenChange={handleOpenChange}
			hideTrigger={hideTrigger}
			activeFiltersCount={activeFiltersCount}
			hasActiveFilters={hasActiveFilters}
			onClearAll={clearAllFilters}
			onApply={() => void form.handleSubmit()}
			isPending={isPending}
			triggerClassName={className}
		>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					void form.handleSubmit();
				}}
				className="space-y-6"
			>
				{/* Statut actif/inactif */}
				<form.Field name="isActive">
					{(field) => (
						<fieldset className="space-y-3">
							<legend className="text-foreground text-sm font-medium">Statut de la variante</legend>
							<RadioGroup
								value={field.state.value}
								onValueChange={(value) => field.handleChange(value as SkuActiveFilter)}
								className="space-y-2"
							>
								{SKU_ACTIVE_STATUS_OPTIONS.map(({ value, label }) => (
									<div key={value} className="flex items-center space-x-2">
										<RadioGroupItem value={value} id={`active-${value}`} />
										<Label
											htmlFor={`active-${value}`}
											className="flex-1 cursor-pointer text-sm font-normal"
										>
											{label}
										</Label>
									</div>
								))}
							</RadioGroup>
						</fieldset>
					)}
				</form.Field>

				<Separator />

				{/* Statut du stock */}
				<form.Field name="stockStatuses" mode="array">
					{(field) => (
						<fieldset className="space-y-3">
							<legend className="text-foreground text-sm font-medium">Statut du stock</legend>
							<div className="space-y-2">
								{SKU_STOCK_STATUS_OPTIONS.map(({ value, label }) => {
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
												className="flex-1 cursor-pointer text-sm font-normal"
											>
												{label}
											</Label>
										</div>
									);
								})}
							</div>
						</fieldset>
					)}
				</form.Field>

				{/* Couleurs */}
				{colorOptions.length > 0 && (
					<>
						<Separator />
						<form.Field name="colorIds" mode="array">
							{(field) => (
								<FilterCheckboxGroup
									legend="Couleur"
									options={colorOptions.map((c) => ({ id: c.id, name: c.name, hex: c.hex }))}
									field={field as CheckboxArrayField}
									idPrefix="color"
								/>
							)}
						</form.Field>
					</>
				)}

				{/* Materiaux */}
				{materialOptions.length > 0 && (
					<>
						<Separator />
						<form.Field name="materialIds" mode="array">
							{(field) => (
								<FilterCheckboxGroup
									legend="Matériau"
									options={materialOptions.map((m) => ({ id: m.id, name: m.name }))}
									field={field as CheckboxArrayField}
									idPrefix="material"
								/>
							)}
						</form.Field>
					</>
				)}
			</form>
		</FilterSheetWrapper>
	);
}

export function SkusFilterSheet(props: ComponentProps<typeof SkusFilterSheetInner>) {
	return (
		<Suspense fallback={null}>
			<SkusFilterSheetInner {...props} />
		</Suspense>
	);
}
